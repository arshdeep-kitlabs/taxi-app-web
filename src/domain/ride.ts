export type RideId = string;

/**
 * How a ride ended.
 *
 * Only two states reach a driver's history: one they drove, and one that was
 * called off. A ride still in progress is not in this table yet — nothing
 * writes a row until it is over.
 */
export type RideStatus = 'completed' | 'cancelled';

export type PaymentMethod = 'card' | 'cash';

/**
 * One finished ride, as the driver's own screens read it.
 *
 * Money is stored per ride rather than recomputed, because a receipt is a
 * historical record: changing the service-fee rate next month must not
 * rewrite what a driver was paid last month.
 */
export type Ride = {
  id: RideId;
  driverId: string;
  /** Who was in the car. First name and initial is all the driver is shown. */
  riderName: string;
  status: RideStatus;
  /** "Signature". One of config.rides.serviceClasses. */
  serviceClass: string;

  /** "18 Devonshire Place, W1G" — one line, as it is shown. */
  pickup: string;
  /**
   * Where the ride was going. Set on a cancellation too — the passenger asked
   * for somewhere, and the history screen shows it whether or not the car
   * ever arrived.
   */
  dropoff: string;

  startedAt: string;
  /** When it finished, one way or the other. A cancellation ends as well. */
  endedAt: string;

  /**
   * Distance and time actually travelled. Zero on a cancellation, which is
   * the truth of it — nothing was driven — rather than an absence.
   */
  distanceKm: number;
  durationMinutes: number;
  /**
   * How long the driver waited at the pickup. Every ride has some; on a
   * cancellation it is what justifies the fee, so the app shows it beside
   * the amount instead of the distance.
   */
  waitMinutes: number;

  /** What the rider was charged. On a cancellation, the fee they were charged. */
  fare: number;
  tip: number;
  /** What Kit-taxi kept. Shown as a negative line on the receipt. */
  serviceFee: number;
  /** fare + tip − serviceFee, as it stood on the day. */
  net: number;

  paymentMethod: PaymentMethod;
  /** 0 while the money is still moving. */
  isSettled: 0 | 1;
};

/**
 * A stretch of time the driver was available for work.
 *
 * Kept apart from rides because "online" is not "on a trip" — the gap between
 * two jobs is time worked, and the earnings screen counts it.
 */
export type DriverShift = {
  id: string;
  driverId: string;
  startedAt: string;
  /** Null while the shift is still open. */
  endedAt: string | null;
};
