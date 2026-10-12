import { AppError } from '../../common/errors/app.error.js';
import type { DriverDocument, DriverDocuments } from '../../domain/document.js';
import { isEditable } from '../../domain/driver.js';
import type {
  DocumentField,
  DocumentImageSlot,
  DocumentSpec,
} from '../app-config/app-config.types.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { DocumentsState, ImageState } from './documents.types.js';
import type { PatchDocumentsInput } from '../../api/driver/07-documents/documents.dto.js';
import type { DocumentRepository } from './ports/document-repository.port.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Step 2 of 4 — identity and documents.
 *
 * The checklist itself lives in config: which cards exist, how many image slots
 * each has, and which typed fields sit beside them. Adding a document, an angle
 * or a field is a config change, and this service keeps working unchanged.
 */
export class DocumentsService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly config: ConfigSource,
    private readonly drivers: DriverRepository,
  ) {}

  private specs(): DocumentSpec[] {
    return this.config.load().documents.documents;
  }

  private specFor(name: string): DocumentSpec | undefined {
    return this.specs().find((spec) => spec.name === name);
  }

  /**
   * The tiles this card is currently asking for.
   *
   * With a dropdown, they come from the chosen type — a birth certificate asks
   * for one image where an Aadhaar card asks for two. Before a choice is made
   * there is nothing to ask for yet.
   */
  private slotsFor(spec: DocumentSpec, type: string | null): DocumentImageSlot[] {
    if (spec.typeOptions.length === 0) return spec.images;
    if (!type) return [];
    return spec.typeOptions.find((option) => option.id === type)?.images ?? [];
  }

  /** What the screen shows on arrival, before anything is touched. */
  async current(driver: string): Promise<DocumentsState> {
    return this.describe(await this.repository.findByDriver(driver));
  }

  /**
   * Merges an upload into what is already stored.
   *
   * Partial by design: a tile can be filled on its own, and sending one never
   * clears another. The app can save as the driver goes rather than holding the
   * whole screen until the end.
   */
  async patch(driver: string, input: PatchDocumentsInput): Promise<DocumentsState> {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      throw AppError.validation({ _: 'REQUIRED' });
    }

    // Once the application is with a reviewer, its files stop moving. Every
    // upload route lands here, so this is the only place the rule is needed.
    await this.assertEditable(driver);

    const stored: DriverDocuments = (await this.repository.findByDriver(driver)) ?? {
      driverId: driver,
      documents: {},
      updatedAt: new Date().toISOString(),
    };

    for (const [name, incoming] of entries) {
      const spec = this.specFor(name);
      if (!spec) {
        throw AppError.validation({ [name]: 'UNKNOWN_DOCUMENT' });
      }

      const document: DriverDocument = stored.documents[name] ?? {
        name,
        type: null,
        images: {},
        fields: {},
      };

      if (incoming.type !== undefined && incoming.type !== document.type) {
        document.type = this.checkType(spec, incoming.type);

        // Changing the type changes the tiles. Anything uploaded against a slot
        // the new type does not have is dropped, so a stale image cannot count
        // towards a card it no longer belongs to.
        const allowed = new Set(this.slotsFor(spec, document.type).map((slot) => slot.name));
        for (const slot of Object.keys(document.images)) {
          if (!allowed.has(slot)) delete document.images[slot];
        }
      }

      for (const [slot, url] of Object.entries(incoming.images ?? {})) {
        this.checkSlot(spec, document.type, slot);
        this.checkUrl(name, slot, url);
        document.images[slot] = { url, uploadedAt: new Date().toISOString() };
      }
      for (const [field, value] of Object.entries(incoming.fields ?? {})) {
        document.fields[field] = this.checkField(spec, field, value);
      }

      stored.documents[name] = document;
    }

    stored.updatedAt = new Date().toISOString();
    return this.describe(await this.repository.save(stored));
  }

  /**
   * Refuses a write while the application is with a reviewer, or once it has
   * been approved. A rejected one is open again, which is the whole point of
   * a rejection: the driver replaces what was wrong and sends it back.
   */
  async assertEditable(driver: string): Promise<void> {
    const record = await this.drivers.findById(driver);
    // A token outlives the row it names: emptying the drivers table leaves
    // every issued token still signed and still unexpired. Saying so is the
    // answer — without this the write reaches MySQL, breaks the foreign key
    // on driver_documents, and a stale token reads as a broken server.
    if (!record) {
      throw AppError.notFound('DRIVER_NOT_FOUND');
    }
    if (!isEditable(record.applicationStatus)) {
      throw AppError.conflict('APPLICATION_LOCKED');
    }
  }

  // ---------------------------------------------------------------- checks

  private checkType(spec: DocumentSpec, type: string): string {
    if (spec.typeOptions.length === 0) {
      throw AppError.validation({ [spec.name]: 'NO_TYPE_TO_CHOOSE' });
    }
    if (!spec.typeOptions.some((option) => option.id === type)) {
      throw AppError.validation({ [`${spec.name}.type`]: 'UNKNOWN_TYPE' });
    }
    return type;
  }

  private checkSlot(spec: DocumentSpec, type: string | null, slot: string): void {
    const slots = this.slotsFor(spec, type);

    if (spec.typeOptions.length > 0 && !type) {
      throw AppError.validation({ [`${spec.name}.type`]: 'TYPE_REQUIRED' });
    }

    if (!slots.some((image) => image.name === slot)) {
      // The accepted slots travel as data rather than inside a sentence.
      throw AppError.validation(
        { [`${spec.name}.images.${slot}`]: 'UNKNOWN_IMAGE_SLOT' },
        { accepts: slots.map((image) => image.name) },
      );
    }
  }

  /**
   * The slot holds a link to a file that is already stored somewhere else.
   *
   * Only the shape is checked. Nothing here can tell whether the address is a
   * photograph of anything, and nothing will until an upload endpoint issues
   * the links itself.
   */
  private checkUrl(name: string, slot: string, url: unknown): void {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw AppError.validation({ [`${name}.images.${slot}`]: 'INVALID_URL' });
    }
  }

  private checkField(spec: DocumentSpec, field: string, value: string): string {
    const definition = spec.fields.find((candidate) => candidate.name === field);
    if (!definition) {
      throw AppError.validation({ [`${spec.name}.fields.${field}`]: 'UNKNOWN_FIELD' });
    }
    return this.checkFieldValue(spec, definition, value);
  }

  private checkFieldValue(spec: DocumentSpec, field: DocumentField, value: string): string {
    const key = `${spec.name}.fields.${field.name}`;
    const trimmed = String(value ?? '').trim();

    if (!trimmed) {
      throw AppError.validation({ [key]: 'REQUIRED' });
    }

    if (field.type === 'month') {
      if (!MONTH.test(trimmed)) {
        throw AppError.validation({ [key]: 'INVALID_FORMAT' });
      }
      // An expired document is no use to a reviewer, so it is refused here
      // rather than being found days later during verification.
      const [year, month] = trimmed.split('-').map(Number);
      const endOfMonth = new Date(Date.UTC(year!, month!, 0, 23, 59, 59));
      if (endOfMonth.getTime() < Date.now()) {
        throw AppError.validation({ [key]: 'EXPIRED' });
      }
      return trimmed;
    }

    return trimmed.toUpperCase();
  }

  // ---------------------------------------------------------------- shaping

  /**
   * Builds what the screen renders: every slot with its state, the counts
   * behind "4 of 7 images", and whether Continue may be enabled.
   */
  private describe(stored: DriverDocuments | null): DocumentsState {
    const specs = this.specs();
    // Looked up once for the whole checklist rather than once per document.
    const mandatory = new Set(specs.filter((spec) => spec.isMandatory).map((spec) => spec.name));

    const documents = specs.map((spec) => {
      const saved = stored?.documents[spec.name];
      const type = saved?.type ?? null;
      const slots = this.slotsFor(spec, type);

      const images: Record<string, ImageState> = {};
      for (const slot of slots) {
        images[slot.name] = saved?.images[slot.name] ? 'uploaded' : 'missing';
      }

      const fields: Record<string, string | null> = {};
      for (const field of spec.fields) {
        fields[field.name] = saved?.fields[field.name] ?? null;
      }

      const needsType = spec.typeOptions.length > 0;
      const complete =
        (!needsType || type !== null) &&
        slots.length > 0 &&
        slots.every((slot) => images[slot.name] === 'uploaded') &&
        spec.fields.every((field) => fields[field.name] !== null);

      return { name: spec.name, type, images, fields, complete };
    });

    // The total follows the chosen types, so picking a single-page ID lowers
    // it rather than leaving an unreachable tile. An optional document is not
    // counted at all, so its tiles never make the screen look unfinished.
    const imagesRequired = documents.reduce(
      (total, document) =>
        mandatory.has(document.name) ? total + Object.keys(document.images).length : total,
      0,
    );
    const imagesUploaded = documents.reduce(
      (total, document) =>
        total + Object.values(document.images).filter((state) => state === 'uploaded').length,
      0,
    );

    return {
      documents,
      imagesUploaded,
      imagesRequired,
      // The Continue button is enabled from this, never from the app's own
      // count. An optional document never holds it back.
      canContinue: documents.every(
        (document) => document.complete || !mandatory.has(document.name),
      ),
    };
  }
}
