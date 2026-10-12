import { AppError } from '../../common/errors/app.error.js';
import type { Driver, PassengerGenderPreference } from '../../domain/driver.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { RidePreferences, UpdateRidePreferencesInput } from './gender-preference.types.js';

/** The choices a driver may send. ANY is the same as not using the mode. */
const PREFERENCES: PassengerGenderPreference[] = ['ANY', 'FEMALE', 'MALE'];

/**
 * Gender-specific riding.
 *
 * Three things decide whether a driver is matched by passenger gender, and all
 * three have to agree:
 *
 *   the feature flag   switched on for everyone, from configuration
 *   a gender to match  the driver's own answer from the sign-up form
 *   the driver's own   toggle, and the preference beside it
 *
 * The flag is a switch on the whole feature, not a change to anyone's data:
 * turning it off stops the rule being applied and leaves every driver's choice
 * where it was, so turning it back on costs no one a second visit to the
 * screen. That is why `isHonoured` is computed on every read rather than
 * written into the row.
 */
export class GenderPreferenceService {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly config: ConfigSource,
  ) {}

  /** GET /ridePreferences */
  async get(driverId: string): Promise<RidePreferences> {
    return this.view(await this.require(driverId));
  }

  /**
   * PATCH /ridePreferences
   *
   * Refused outright while the feature is off: letting a driver set something
   * nothing will act on, and showing it back to them as set, is worse than
   * saying no.
   */
  async update(driverId: string, input: UpdateRidePreferencesInput): Promise<RidePreferences> {
    if (!this.isFeatureAvailable()) {
      throw new AppError(403, 'GENDER_FEATURE_DISABLED');
    }

    const driver = await this.require(driverId);

    const fields: Record<string, string> = {};
    if (input.isGenderSpecificModeOn !== undefined && typeof input.isGenderSpecificModeOn !== 'boolean') {
      fields.isGenderSpecificModeOn = 'INVALID_FORMAT';
    }
    if (
      input.passengerGenderPreference !== undefined &&
      !PREFERENCES.includes(input.passengerGenderPreference)
    ) {
      fields.passengerGenderPreference = 'UNKNOWN_CHOICE';
    }
    if (Object.keys(fields).length > 0) {
      throw AppError.validation(fields, { accepts: PREFERENCES });
    }

    // An empty body is a mistake rather than a no-op: the driver pressed save
    // and nothing would have changed.
    if (input.isGenderSpecificModeOn === undefined && input.passengerGenderPreference === undefined) {
      throw new AppError(422, 'NOTHING_TO_UPDATE');
    }

    // There has to be a gender to match on. The driver's own answer counts:
    // nobody has to approve it first. The preference alone needs nothing at
    // all, so only switching the mode on is checked.
    if (input.isGenderSpecificModeOn === true && driver.gender === null) {
      throw new AppError(403, 'GENDER_NOT_SET');
    }

    return this.view(
      await this.drivers.update({
        ...driver,
        ...(input.isGenderSpecificModeOn !== undefined && {
          genderSpecificModeEnabled: input.isGenderSpecificModeOn,
        }),
        ...(input.passengerGenderPreference !== undefined && {
          passengerGenderPreference: input.passengerGenderPreference,
        }),
      }),
    );
  }

  /**
   * Whether this driver's gender preference should be applied to a ride right
   * now, and which passengers it allows.
   *
   * This is the one place that answers the question, so whatever comes to
   * dispatch rides asks here rather than reading the columns and repeating the
   * three-way rule. Null means match them with anyone.
   */
  matchingPreference(driver: Driver): PassengerGenderPreference | null {
    if (!this.isHonoured(driver)) return null;
    return driver.passengerGenderPreference === 'ANY' ? null : driver.passengerGenderPreference;
  }

  private isFeatureAvailable(): boolean {
    return this.config.load().features.genderPreference;
  }

  /** Everything but the driver's own toggle: whether they may set it at all. */
  private isEligible(driver: Driver): boolean {
    return this.isFeatureAvailable() && driver.gender !== null;
  }

  /** All three conditions, in one place. */
  private isHonoured(driver: Driver): boolean {
    return this.isEligible(driver) && driver.genderSpecificModeEnabled;
  }

  private async require(driverId: string): Promise<Driver> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');
    return driver;
  }

  private view(driver: Driver): RidePreferences {
    return {
      isFeatureAvailable: this.isFeatureAvailable(),
      driverGender: driver.gender,
      canTurnOnGenderSpecificMode: this.isEligible(driver),
      isGenderSpecificModeOn: this.isHonoured(driver),
      passengerGenderPreference: driver.passengerGenderPreference,
    };
  }
}


