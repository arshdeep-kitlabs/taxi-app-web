import type { Gender, PassengerGenderPreference } from '../../domain/driver.js';

/**
 * The ride-preferences screen.
 *
 * The labels and the explanatory paragraph are not here — the app owns its own
 * copy, as everywhere else. Only this driver's state travels.
 */
export type RidePreferences = {
  /**
   * Whether gender-specific riding is switched on for everyone right now.
   *
   * Also in `GET /config`, under `features.genderPreference`; it is repeated
   * here because the rest of this response has to be read against it. False
   * means the screen explains the feature is unavailable rather than showing a
   * toggle the server would refuse.
   */
  isFeatureAvailable: boolean;
  /**
   * The driver's gender, from the sign-up form or from an admin. Null if
   * neither has supplied one — which is the only thing that stops the toggle,
   * and what the screen says when it is unavailable.
   */
  driverGender: Gender | null;
  /**
   * Whether this driver may turn the mode on at all.
   *
   * The app could work it out from the two fields above, and should not have
   * to: eligibility is the server's answer to give, so the rule behind it can
   * gain a condition without every app release having to learn it. A false
   * here is exactly what a `PATCH` turning the mode on would refuse.
   */
  canTurnOnGenderSpecificMode: boolean;
  /**
   * Whether the mode is being honoured — not merely what the driver asked for.
   *
   * It reads false whenever the feature is switched off for everyone, even if
   * this driver turned the mode on earlier: nothing is acting on their choice,
   * so saying "on" would be untrue. The choice itself is kept, and comes back
   * by itself when the feature returns.
   */
  isGenderSpecificModeOn: boolean;
  /** Which passengers they want while the mode above is on. */
  passengerGenderPreference: PassengerGenderPreference;
};

/** A `PATCH /ridePreferences` body. Both are optional; one of them is required. */
export type UpdateRidePreferencesInput = {
  isGenderSpecificModeOn?: boolean;
  passengerGenderPreference?: PassengerGenderPreference;
};
