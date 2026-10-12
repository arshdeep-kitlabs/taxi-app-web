import { randomInt } from 'node:crypto';
import { AppError } from '../../common/errors/app.error.js';
import { isEditable } from '../../domain/driver.js';
import type { DriverDocument } from '../../domain/document.js';
import type { DocumentField, DocumentSpec } from '../app-config/app-config.types.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { DocumentsService } from '../documents/documents.service.js';
import type { DocumentRepository } from '../documents/ports/document-repository.port.js';
import type { VehicleDetailsService } from '../vehicle/vehicle-details.service.js';
import type { SubmitApplicationInput } from '../../api/driver/09-submit/submit.dto.js';
import type {
  TrackResult,
  ReviewDocument,
  ReviewImage,
  ReviewResult,
  ReviewValue,
  SubmitResult,
} from './review.types.js';

/**
 * Step 4 of 4 — everything the driver is about to submit, on one screen.
 *
 * It reads what the earlier screens collected and lists it back flat: a row
 * per value, a row per image, and whether each image is in. Nothing here holds
 * its own copy of the application; correcting something writes to exactly the
 * same place the upload screens write to.
 */
export class ReviewService {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly stored: DocumentRepository,
    private readonly documents: DocumentsService,
    private readonly vehicle: VehicleDetailsService,
    private readonly config: ConfigSource,
  ) {}

  async current(driverId: string): Promise<ReviewResult> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    const saved = await this.stored.findByDriver(driverId);
    const specs = this.config.load().documents.documents;

    const rejected = new Set(driver.rejectedDocuments);
    const identityDocuments = specs
      .filter((spec) => spec.collectedAt === 'identity')
      .map((spec) => this.describe(spec, saved?.documents[spec.name], rejected));
    const vehicleDocuments = specs
      .filter((spec) => spec.collectedAt === 'vehicle')
      .map((spec) => this.describe(spec, saved?.documents[spec.name], rejected));

    const all = [...identityDocuments, ...vehicleDocuments];

    // Only mandatory items hold the button back. An optional document sits on
    // the list unticked without ever blocking a submission.
    const missingImages = all.reduce(
      (total, document) =>
        document.isMandatory === 0
          ? total
          : total + document.images.filter((image) => image.isUploaded === 0).length,
      0,
    );
    const missingValues = all.reduce(
      (total, document) =>
        document.isMandatory === 0
          ? total
          : total + document.values.filter((value) => value.value === null).length,
      0,
    );

    return {
      vehicle: await this.vehicleValues(driverId),
      personalInformation: {
        name: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || null,
        dateOfBirth: driver.dateOfBirth,
        mobile: driver.phone,
        email: driver.email,
      },
      identityDocuments,
      vehicleDocuments,
      missingImages,
      missingValues,
      // Also 0 once it is with a reviewer: the button has nothing left to do.
      canSubmit:
        isEditable(driver.applicationStatus) && missingImages === 0 && missingValues === 0 ? 1 : 0,
      status: driver.applicationStatus,
      submittedAt: driver.submittedAt,
      reviewedAt: driver.reviewedAt,
    };
  }

  /**
   * The car's details as rows.
   *
   * The driver picked from a list the app drew, so a stored id is turned back
   * into the label they saw — "graphite" reads as "Graphite" on the review.
   */
  private async vehicleValues(driverId: string): Promise<ReviewValue[]> {
    const stored = await this.vehicle.values(driverId);

    return this.config.load().documents.vehicleDetails.fields.map((field: DocumentField) => ({
      name: field.name,
      label: field.label,
      value: this.readable(field, stored[field.name] ?? null),
    }));
  }

  private readable(field: DocumentField, value: string | null): string | null {
    if (value === null) return null;
    if (field.type !== 'select') return value;
    return field.options?.find((option) => option.id === value)?.label ?? value;
  }

  /**
   * Sends the application for checking.
   *
   * It refuses anything a reviewer could not act on — an incomplete list, a
   * declaration that was never ticked, a second submission — and freezes every
   * document from that point, so nothing changes under someone reading it.
   */
  async submit(driverId: string, input: SubmitApplicationInput): Promise<SubmitResult> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    if (!isEditable(driver.applicationStatus)) {
      throw AppError.conflict('ALREADY_SUBMITTED');
    }

    if (!input.declarationAccepted) {
      throw AppError.validation({ declarationAccepted: 'REQUIRED' });
    }

    const review = await this.current(driverId);
    if (review.canSubmit === 0) {
      // What is outstanding travels as counts, so the app words its own prompt.
      throw new AppError(409, 'APPLICATION_INCOMPLETE', undefined, {
        missingImages: review.missingImages,
        missingValues: review.missingValues,
      });
    }

    const submittedAt = new Date().toISOString();
    // Issued once and kept: a resubmission after a rejection is the same case.
    const reference = driver.reference ?? (await this.issueReference(driver.phone));

    await this.drivers.update({
      ...driver,
      applicationStatus: 'submitted',
      reference,
      submittedAt,
      // A resubmission starts clean: last time's complaints are answered.
      // Both halves go, or the status screen would still be showing the old
      // reviewer's note over an application that is back under review.
      rejectedDocuments: [],
      rejection: null,
      // The same tick accepts the terms, so consent is dated with the record.
      acceptedTermsAt: driver.acceptedTermsAt ?? submittedAt,
    });

    return { status: 'submitted', reference, submittedAt };
  }

  /** Where the application stands, for the verification screen. */
  async track(driverId: string): Promise<TrackResult> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    return {
      reference: driver.reference,
      status: driver.applicationStatus,
      submittedAt: driver.submittedAt,
      reviewedAt: driver.reviewedAt,
      rejection: driver.rejection,
    };
  }

  /**
   * Builds a reference the driver can read out: KT-4821-GB.
   *
   * The country half comes from their own number, so support can tell at a
   * glance which market a case belongs to. It retries on the small chance of
   * a collision rather than handing two drivers the same reference.
   */
  private async issueReference(phone: string): Promise<string> {
    const { referencePrefix, referenceDigits } = this.config.load().application;

    // Longest dial code first, so +44 does not win against a longer one.
    const country = [...this.config.load().signIn.countries]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((candidate) => phone.startsWith(candidate.dialCode));

    const lowest = 10 ** (referenceDigits - 1);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const digits = randomInt(lowest, lowest * 10);
      const reference = `${referencePrefix}-${digits}-${country?.code ?? 'XX'}`;
      if (!(await this.drivers.findByReference(reference))) return reference;
    }

    throw new AppError(503, 'REFERENCE_UNAVAILABLE');
  }


  private describe(
    spec: DocumentSpec,
    saved: DriverDocument | undefined,
    rejected: Set<string>,
  ): ReviewDocument {
    const selectedChoice = saved?.type ?? null;
    const chosen = spec.typeOptions.find((option) => option.id === selectedChoice);

    // The tiles follow the chosen type, exactly as they do on the upload
    // screen, so the review lists what was actually asked for and no more.
    const slots = spec.typeOptions.length > 0 ? (chosen?.images ?? []) : spec.images;

    const images: ReviewImage[] = slots.map((slot) => {
      const uploaded = saved?.images[slot.name];
      return {
        name: slot.name,
        label: slot.label,
        isMandatory: spec.isMandatory ? 1 : 0,
        isUploaded: uploaded ? 1 : 0,
        url: uploaded?.url ?? null,
      };
    });

    const values: ReviewValue[] = spec.fields.map((field) => ({
      name: field.name,
      label: field.label,
      value: saved?.fields[field.name] ?? null,
    }));

    const needsChoice = spec.typeOptions.length > 0;

    return {
      name: spec.name,
      label: spec.label,
      isMandatory: spec.isMandatory ? 1 : 0,
      selectedChoice,
      selectedChoiceLabel: chosen?.label ?? null,
      values,
      images,
      // Set by a reviewer who wants this one again. The app marks the tile.
      isRejected: rejected.has(spec.name) ? 1 : 0,
      isComplete:
        (!needsChoice || selectedChoice !== null) &&
        images.length > 0 &&
        images.every((image) => image.isUploaded === 1) &&
        values.every((value) => value.value !== null)
          ? 1
          : 0,
    };
  }
}
