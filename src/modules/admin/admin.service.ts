import type { RowDataPacket } from 'mysql2/promise';
import type { AccountStatus, ApplicationStatus, Driver, Gender, Rejection } from '../../domain/driver.js';
import type { Database } from '../../infrastructure/mysql/database.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { DocumentsService } from '../documents/documents.service.js';
import type { DocumentRepository } from '../documents/ports/document-repository.port.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { VehicleRepository } from '../vehicle/ports/vehicle-repository.port.js';
import type { AdminUserRepository } from '../admin-auth/ports/admin-user-repository.port.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { AppError } from '../../common/errors/app.error.js';
import type {
  AdminDocument,
  ApplicationAction,
  ApplicationDetail,
  ApplicationRow,
  DirectoryRow,
  DriverProfile,
  Listing,
  VehicleSnapshot,
} from './admin.types.js';

export type DirectoryQuery = { search?: string; status?: AccountStatus };
export type ApplicationQuery = { search?: string; status?: ApplicationStatus };

export type UpdateDriverInput = {
  status?: AccountStatus;
  email?: string;
  city?: string;
  /**
   * The driver's gender, read off the identity document on screen. Sending it
   * is the act of verifying it, so the server stamps the time itself rather
   * than taking one. Null clears both, and withdraws the driver's access to
   * gender-specific riding.
   */
  gender?: Gender | null;
  vehicle?: Record<string, string | null>;
};

interface DirectoryDbRow extends RowDataPacket {
  id: string;
  driver_number: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string;
  city: string | null;
  rating: string | null;
  total_rides: number;
  earnings: string;
  created_at: string;
  account_status: AccountStatus;
}

interface ApplicationDbRow extends RowDataPacket {
  id: string;
  first_name: string | null;
  last_name: string | null;
  reference: string | null;
  submitted_at: string | null;
  application_status: ApplicationStatus;
  rejected_documents: unknown;
}

const VALID_ACCOUNT_STATUSES: AccountStatus[] = ['active', 'suspended', 'blocked'];

const VALID_GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];

const VALID_APP_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: [],
  submitted: ['in_review', 'approved', 'rejected', 'changes_requested'],
  in_review: ['approved', 'rejected', 'changes_requested'],
  changes_requested: ['in_review', 'approved', 'rejected'],
  approved: [],
  rejected: [],
};

const toIso = (value: string | null): string | null =>
  value === null ? null : new Date(`${value.replace(' ', 'T')}Z`).toISOString();

const fullName = (first: string | null, last: string | null): string | null =>
  [first, last].filter(Boolean).join(' ') || null;

export class AdminService {
  constructor(
    private readonly db: Database,
    private readonly documents: DocumentsService,
    private readonly config: ConfigSource,
    private readonly drivers: DriverRepository,
    private readonly vehicles: VehicleRepository,
    /** Only to put a reviewer's name on a rejection. */
    private readonly admins: AdminUserRepository,
    /** The uploads themselves. `documents` above reports state, not urls. */
    private readonly documentStore: DocumentRepository,
    /** To tell a driver watching the status screen, the moment it changes. */
    private readonly realtime: RealtimeService,
  ) {}

  // ─── Directory ────────────────────────────────────────────────────────────

  async directory(query: DirectoryQuery): Promise<Listing<DirectoryRow>> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (query.status) {
      where.push('account_status = ?');
      values.push(query.status);
    }
    if (query.search) {
      where.push(
        `(CONCAT_WS(' ', first_name, last_name) LIKE ? OR email LIKE ? OR phone LIKE ?
          OR CAST(driver_number AS CHAR) LIKE ?)`,
      );
      const like = `%${query.search.trim()}%`;
      values.push(like, like, like, like);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await this.db.query<DirectoryDbRow[]>(
      `SELECT id, driver_number, first_name, last_name, email, phone, city, rating,
              total_rides, earnings, created_at, account_status
         FROM drivers ${clause}
        ORDER BY created_at DESC`,
      values,
    );

    return {
      rows: rows.map((row) => ({
        id: row.id,
        code: `DR-${String(row.driver_number).padStart(4, '0')}`,
        name: fullName(row.first_name, row.last_name),
        email: row.email,
        phone: row.phone,
        city: row.city,
        rating: row.rating === null ? null : Number(row.rating),
        totalRides: row.total_rides,
        earnings: Number(row.earnings),
        joinedAt: toIso(row.created_at)!,
        status: row.account_status,
      })),
      total: rows.length,
    };
  }

  // ─── Driver profile ───────────────────────────────────────────────────────

  /**
   * Every document the checklist asks for, with what the driver actually sent.
   *
   * Driven from config rather than from what was uploaded, so a document
   * nobody has touched still appears as an empty card instead of vanishing
   * from the screen. The labels travel with it because the admin panel has no
   * copy of the config to look them up in.
   */
  private async documentsFor(driver: Driver): Promise<AdminDocument[]> {
    const stored = await this.documentStore.findByDriver(driver.id);
    const rejected = new Set(driver.rejectedDocuments);
    // The reason a document was sent back, so the screen showing the card can
    // show the note with it rather than joining the two itself.
    const reasons = new Map(
      (driver.rejection?.documents ?? []).map((entry) => [entry.id, entry.reason]),
    );

    return this.config.load().documents.documents.map((spec) => {
      const saved = stored?.documents[spec.name] ?? null;
      const type = saved?.type ?? null;

      // A document with a dropdown asks for different photos per choice, so
      // the slots follow the choice rather than the document.
      const chosen = spec.typeOptions.find((option) => option.id === type) ?? null;
      const slots = spec.typeOptions.length ? (chosen?.images ?? []) : spec.images;

      const images = saved?.images ?? {};
      const expectedImages = slots.map((slot) => ({
        name: slot.name,
        label: slot.label,
        isUploaded: (images[slot.name] ? 1 : 0) as 0 | 1,
      }));

      return {
        id: spec.name,
        label: spec.label,
        isMandatory: spec.isMandatory,
        type,
        typeLabel: chosen?.label ?? null,
        images,
        expectedImages,
        fields: spec.fields.map((field) => ({
          name: field.name,
          label: field.label,
          value: saved?.fields[field.name] ?? null,
        })),
        isRejected: (rejected.has(spec.name) ? 1 : 0) as 0 | 1,
        rejectionReason: reasons.get(spec.name) ?? null,
        isComplete: (
          slots.length > 0 &&
          expectedImages.every((image) => image.isUploaded === 1) &&
          spec.fields.every((field) => saved?.fields[field.name])
            ? 1
            : 0
        ) as 0 | 1,
      };
    });
  }

  /** The car's typed details, labelled as the form asks for them. */
  private vehicleDetailsFor(vehicle: VehicleSnapshot | null) {
    return this.config.load().documents.vehicleDetails.fields.map((field) => ({
      name: field.name,
      label: field.label,
      value: vehicle?.[field.name] ?? null,
    }));
  }

  async driverProfile(driverId: string): Promise<DriverProfile> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    const vehicleStored = await this.vehicles.findByDriver(driverId);
    const vehicle = vehicleStored ? vehicleStored.fields : null;

    return {
      id: driver.id,
      code: `DR-${String(driver.number).padStart(4, '0')}`,
      name: fullName(driver.firstName, driver.lastName),
      email: driver.email,
      phone: driver.phone,
      dateOfBirth: driver.dateOfBirth,
      city: driver.city,
      rating: driver.rating,
      totalRides: driver.totalRides,
      // Placeholders — real values come from a rides table once it exists.
      completedRides: 0,
      cancelledRides: 0,
      earnings: driver.earnings,
      joinedAt: driver.createdAt,
      status: driver.accountStatus,
      gender: driver.gender,
      genderVerifiedAt: driver.genderVerifiedAt,
      vehicle,
      vehicleDetails: this.vehicleDetailsFor(vehicle),
      documents: await this.documentsFor(driver),
      application: {
        status: driver.applicationStatus,
        reference: driver.reference,
        submittedAt: driver.submittedAt,
        reviewedAt: driver.reviewedAt,
        rejection: driver.rejection,
      },
      // Empty until a rides table exists. Shape is defined in admin.types.ts
      // so the frontend can render the table columns without any future change.
      rides: [],
    };
  }

  // ─── Update driver (status + profile in one call) ─────────────────────────

  /**
   * Returns the profile as it now stands, so a screen that just saved has
   * the new version without asking for it again.
   */
  async updateDriver(driverId: string, input: UpdateDriverInput): Promise<DriverProfile> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    if (input.status !== undefined && !VALID_ACCOUNT_STATUSES.includes(input.status)) {
      throw AppError.validation({ status: 'Must be active, suspended or blocked.' });
    }

    if (input.gender !== undefined && input.gender !== null && !VALID_GENDERS.includes(input.gender)) {
      throw AppError.validation({ gender: 'UNKNOWN_CHOICE' }, { accepts: VALID_GENDERS });
    }

    await this.drivers.update({
      ...driver,
      ...(input.status !== undefined && { accountStatus: input.status }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.city !== undefined && { city: input.city }),
      // Recording a gender is what verifies it, so the stamp goes on here and
      // comes off together with the value. A driver who had the mode on keeps
      // their choice stored, but it stops being honoured the moment the
      // gender behind it is withdrawn.
      ...(input.gender !== undefined && {
        gender: input.gender,
        genderVerifiedAt: input.gender === null ? null : new Date().toISOString(),
      }),
    });

    // Vehicle fields are stored separately — only touch them when sent.
    // Null values are dropped: clearing a field removes it rather than storing null.
    if (input.vehicle !== undefined) {
      const stored = (await this.vehicles.findByDriver(driverId)) ?? {
        driverId,
        fields: {} as Record<string, string>,
        updatedAt: new Date().toISOString(),
      };
      const merged: Record<string, string> = { ...stored.fields };
      for (const [key, val] of Object.entries(input.vehicle)) {
        if (val === null) {
          delete merged[key];
        } else {
          merged[key] = val;
        }
      }
      await this.vehicles.save({
        ...stored,
        fields: merged,
        updatedAt: new Date().toISOString(),
      });
    }

    return this.driverProfile(driverId);
  }

  // ─── Applications list ────────────────────────────────────────────────────

  async applications(query: ApplicationQuery): Promise<Listing<ApplicationRow>> {
    const where = ["application_status <> 'draft'"];
    const values: unknown[] = [];

    if (query.status) {
      where.push('application_status = ?');
      values.push(query.status);
    }
    if (query.search) {
      where.push("(CONCAT_WS(' ', first_name, last_name) LIKE ? OR reference LIKE ?)");
      const like = `%${query.search.trim()}%`;
      values.push(like, like);
    }

    const [rows] = await this.db.query<ApplicationDbRow[]>(
      `SELECT id, first_name, last_name, reference, submitted_at, application_status,
              rejected_documents
         FROM drivers
        WHERE ${where.join(' AND ')}
        ORDER BY submitted_at DESC`,
      values,
    );

    const mandatory = new Set(
      this.config
        .load()
        .documents.documents.filter((spec) => spec.isMandatory)
        .map((spec) => spec.name),
    );

    const counted = await Promise.all(
      rows.map(async (row) => {
        const state = await this.documents.current(row.id);
        return {
          driverId: row.id,
          driverName: fullName(row.first_name, row.last_name),
          applicationId: row.reference,
          submittedAt: toIso(row.submitted_at),
          documentsUploaded: state.documents.filter(
            (document) => document.complete && mandatory.has(document.name),
          ).length,
          documentsRequired: mandatory.size,
          status: row.application_status,
          rejectedDocuments:
            typeof row.rejected_documents === 'string'
              ? (JSON.parse(row.rejected_documents) as string[])
              : ((row.rejected_documents ?? []) as string[]),
        };
      }),
    );

    return { rows: counted, total: counted.length };
  }

  // ─── Application detail ───────────────────────────────────────────────────

  async applicationDetail(driverId: string): Promise<ApplicationDetail> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('APPLICATION_NOT_FOUND');

    if (driver.applicationStatus === 'draft') {
      throw AppError.notFound('APPLICATION_NOT_FOUND');
    }

    const vehicleStored = await this.vehicles.findByDriver(driverId);
    const vehicle = vehicleStored ? vehicleStored.fields : null;

    return {
      driverId: driver.id,
      driverName: fullName(driver.firstName, driver.lastName),
      applicationId: driver.reference,
      status: driver.applicationStatus,
      submittedAt: driver.submittedAt,
      reviewedAt: driver.reviewedAt,
      driver: {
        phone: driver.phone,
        email: driver.email,
        dateOfBirth: driver.dateOfBirth,
        city: driver.city,
      },
      vehicle,
      rejection: driver.rejection,
      documents: await this.documentsFor(driver),
    };
  }

  // ─── Update application (all review actions in one call) ──────────────────

  /**
   * `actingAdminId` comes from the token, never from the body, so a reviewer's
   * name on a rejection is always the person who actually pressed the button.
   */
  async updateApplication(
    driverId: string,
    input: ApplicationAction,
    actingAdminId: string,
  ): Promise<ApplicationDetail> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('APPLICATION_NOT_FOUND');

    if (driver.applicationStatus === 'draft') {
      throw AppError.notFound('APPLICATION_NOT_FOUND');
    }

    if (input.action === 'approve_document' || input.action === 'reject_document') {
      // Per-document review is not yet stored in the DB.
      // This stub is here so the route exists and the frontend can call it.
      // When a document_reviews table is added, replace this block with the
      // real write — no other file needs to change.
      return this.applicationDetail(driverId);
    }

    const nextStatus: ApplicationStatus =
      input.action === 'approve_application'
        ? 'approved'
        : input.action === 'reject_application'
          ? 'rejected'
          : 'changes_requested';

    const allowed = VALID_APP_TRANSITIONS[driver.applicationStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw AppError.conflict(
        'INVALID_TRANSITION',
      );
    }

    let rejectedDocuments: string[] = [];
    let rejection: Rejection | null = null;

    // Both refusals carry the admin's own words, so a driver is never left
    // guessing. What differs is what they can do next: request_changes names
    // documents to redo and reopens them, a rejection names none and is final.
    // An approval carries nothing, which is why rejection ends up null there.
    if (input.action === 'reject_application' || input.action === 'request_changes') {
      const reviewer = await this.admins.findById(actingAdminId);

      rejection = {
        reviewer: reviewer?.name ?? 'The review team',
        team: this.config.load().application.reviewTeam,
        message: input.action === 'reject_application' ? input.reason : input.message,
        documents: (input.documents ?? []).map((entry) => ({
          id: entry.id,
          // Absent means the whole document, and null is how that is stored.
          image: entry.image ?? null,
          reason: entry.reason,
        })),
      };

      // Which tiles the app marks, and which uploads reopen. Derived from the
      // list above so the two can never disagree — but only for a send-back:
      // a rejection is final, so nothing reopens even though it names them.
      if (input.action === 'request_changes') {
        rejectedDocuments = [...new Set(rejection.documents.map((entry) => entry.id))];
      }
    }

    // Approving is the moment someone has actually read the identity document,
    // so a gender the driver claimed on the sign-up form becomes a confirmed
    // one here. Only when they claimed something and nobody has confirmed it
    // yet: an explicit PATCH already carries its own stamp, and a correction
    // made there must not be undone by a later approval.
    const confirmsGender =
      nextStatus === 'approved' && driver.gender !== null && driver.genderVerifiedAt === null;

    const reviewedAt = new Date().toISOString();

    await this.drivers.update({
      ...driver,
      applicationStatus: nextStatus,
      reviewedAt,
      rejectedDocuments,
      rejection,
      ...(confirmsGender && { genderVerifiedAt: new Date().toISOString() }),
    });

    // The driver may be sitting on the status screen right now. Pushing it
    // saves them polling, and nothing is lost if they are not connected:
    // GET /trackStatus reports the same thing on their next launch.
    this.realtime.send(driverId, 'applicationReviewed', {
      status: nextStatus,
      reviewedAt,
      rejection,
    });

    return this.applicationDetail(driverId);
  }
}
