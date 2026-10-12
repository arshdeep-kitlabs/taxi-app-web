import type { Gender } from '../../domain/driver.js';

/**
 * The profile screen.
 *
 * Almost none of this is new: it is the driver, their vehicle, their
 * documents and their week, gathered so one screen is one call rather than
 * four arriving at four different moments.
 *
 * The row labels — "Personal information", "Vehicle details" — are not here.
 * Only the value each row shows on its right.
 */
export type Profile = {
  name: string | null;
  /**
   * The gender a reviewer recorded from this driver's identity document, or
   * null if no one has. Repeated from `GET /ridePreferences`, which is where
   * the gender-specific riding screen reads it along with everything else that
   * screen needs — this is the personal-information row's copy of it.
   */
  gender: Gender | null;
  /**
   * Their star rating. Null because nothing produces one yet — there is no
   * rating system, so this is a known gap rather than a driver with no score.
   */
  rating: number | null;
  /** Counted from the rides themselves, not from a column nothing maintains. */
  totalRides: number;
  /** The date they joined, for "since 2023". */
  memberSince: string;

  verification: {
    /** 1 once the application has been approved. */
    isVerified: 0 | 1;
    /**
     * The class they drive, taken from their most recent ride. A real
     * assignment would live on the driver or the vehicle; nothing does that
     * yet, so this reads what they have actually been sold as.
     */
    rideClass: string | null;
    /** When the first of their documents runs out. Null if none expire. */
    renewsOn: string | null;
  };

  account: {
    /** "verified" once approved, otherwise where the application stands. */
    personalInformation: string;
    /** "Volvo S90", or null before the vehicle screen is filled in. */
    vehicle: string | null;
    /** How many documents run out inside the configured warning window. */
    documentsExpiringCount: number;
  };

  activity: {
    earningsThisWeek: number;
    ridesThisWeek: number;
  };
};
