import { AppError } from '../../common/errors/app.error.js';
import type { DriverVehicle } from '../../domain/vehicle.js';
import type { DocumentField } from '../app-config/app-config.types.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { VehicleDetailsInput } from '../../api/driver/07-documents/documents.dto.js';
import type { VehicleRepository } from './ports/vehicle-repository.port.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The typed details of the car — make, model, year, colour, plate.
 *
 * The app draws and holds this form itself, so nothing here describes it back.
 * This only checks what arrives against the definitions in config — a select
 * must be one of its options, a number must sit inside its range, a plate must
 * match its pattern — and keeps it for the review screen and the admin.
 */
export class VehicleDetailsService {
  constructor(
    private readonly repository: VehicleRepository,
    private readonly config: ConfigSource,
  ) {}

  private fields(): DocumentField[] {
    return this.config.load().documents.vehicleDetails.fields;
  }

  private fieldFor(name: string): DocumentField | undefined {
    return this.fields().find((field) => field.name === name);
  }

  /**
   * The saved values on their own. The review screen turns them into rows; the
   * admin will read the same thing.
   */
  async values(driver: string): Promise<Record<string, string | null>> {
    const stored = await this.repository.findByDriver(driver);
    const values: Record<string, string | null> = {};
    for (const field of this.fields()) {
      values[field.name] = stored?.fields[field.name] ?? null;
    }
    return values;
  }

  /**
   * Merges a save into what is already stored.
   *
   * Partial by design: one box can be saved on its own and sending it never
   * clears another, so the app can save as the driver types rather than
   * holding the whole form until the end.
   */
  async save(driver: string, input: VehicleDetailsInput): Promise<void> {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      throw AppError.validation({ _: 'REQUIRED' });
    }

    const stored: DriverVehicle = (await this.repository.findByDriver(driver)) ?? {
      driverId: driver,
      fields: {},
      updatedAt: new Date().toISOString(),
    };

    for (const [name, raw] of entries) {
      const field = this.fieldFor(name);
      if (!field) {
        throw AppError.validation({ [name]: 'UNKNOWN_FIELD' });
      }

      const value = this.check(field, raw);
      if (value === null) {
        // An optional box cleared on purpose. Removing it rather than storing
        // an empty string keeps "not answered" a single state.
        delete stored.fields[name];
      } else {
        stored.fields[name] = value;
      }
    }

    stored.updatedAt = new Date().toISOString();
    await this.repository.save(stored);
  }

  // ---------------------------------------------------------------- checks

  /** Returns the value to store, or null when the box is being cleared. */
  private check(field: DocumentField, raw: string | number): string | null {
    const trimmed = String(raw).trim();

    if (!trimmed) {
      if (field.isMandatory) {
        throw AppError.validation({ [field.name]: 'REQUIRED' });
      }
      return null;
    }

    if (field.type === 'select') return this.checkChoice(field, trimmed);
    if (field.type === 'number') return this.checkNumber(field, trimmed);
    if (field.type === 'month') return this.checkMonth(field, trimmed);
    return this.checkText(field, trimmed);
  }

  private checkChoice(field: DocumentField, value: string): string {
    const options = field.options ?? [];
    const chosen = options.find((option) => option.id.toLowerCase() === value.toLowerCase());

    if (!chosen) {
      // The accepted ids travel as data, so the app can say what it likes
      // about a stale list it is still holding.
      throw AppError.validation({ [field.name]: 'UNKNOWN_CHOICE' }, {
        accepts: options.map((option) => option.id),
      });
    }

    return chosen.id;
  }

  private checkNumber(field: DocumentField, value: string): string {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      throw AppError.validation({ [field.name]: 'INVALID_FORMAT' });
    }

    // A car built before the fleet rules allow, or a year in the far future,
    // is refused here rather than at review days later.
    if ((field.min !== undefined && parsed < field.min) ||
        (field.max !== undefined && parsed > field.max)) {
      throw AppError.validation({ [field.name]: 'OUT_OF_RANGE' }, {
        ...(field.min !== undefined ? { min: field.min } : {}),
        ...(field.max !== undefined ? { max: field.max } : {}),
      });
    }

    return String(parsed);
  }

  private checkMonth(field: DocumentField, value: string): string {
    if (!MONTH.test(value)) {
      throw AppError.validation({ [field.name]: 'INVALID_FORMAT' });
    }

    const [year, month] = value.split('-').map(Number);
    const endOfMonth = new Date(Date.UTC(year!, month!, 0, 23, 59, 59));
    if (endOfMonth.getTime() < Date.now()) {
      throw AppError.validation({ [field.name]: 'EXPIRED' });
    }

    return value;
  }

  private checkText(field: DocumentField, value: string): string {
    // Runs of spaces come from a plate typed with the group separator, so they
    // are squeezed before the pattern sees them.
    const tidied = value.replace(/\s+/g, ' ');

    if (field.pattern === undefined) return tidied;

    // A pattern marks an identifier rather than free text — a plate, not a
    // model name — so case is normalised before matching. Free text is left
    // exactly as the driver typed it.
    const normalised = tidied.toUpperCase();
    if (!new RegExp(field.pattern).test(normalised)) {
      throw AppError.validation({ [field.name]: 'INVALID_FORMAT' });
    }

    return normalised;
  }

}
