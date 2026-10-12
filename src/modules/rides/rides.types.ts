import type { PaymentMethod, RideStatus } from '../../domain/ride.js';

/*
  The names here are the ones a person reading a response should recognise
  without being told: totalFare, driverEarnings, waitingTimeInMinutes. They are
  longer than the column names behind them on purpose — a field that has to be
  explained costs more in questions than it saves in characters.
*/

/** One row in the history list. Enough to draw it, nothing more. */
export type RideListItem = {
  rideId: string;
  /** ISO. The app shows "10:17" in its own locale. */
  startTime: string;
  passengerName: string;
  status: RideStatus;
  pickupAddress: string;
  destinationAddress: string;
  /** What the driver kept, after the service fee. */
  driverEarnings: number;
  /** Both zero on a cancellation — nothing was driven. */
  distanceInKm: number;
  durationInMinutes: number;
  /** The wait at the pickup. On a cancellation it is what earned the fee. */
  waitingTimeInMinutes: number;
};

/**
 * One day of history.
 *
 * Grouped on the server because the day a ride belongs to is a local
 * question, and the client would need the timezone and the same arithmetic to
 * agree with the totals underneath.
 */
export type RideDay = {
  /** "2026-09-24". The app words "Today" and "Yesterday" from it. */
  date: string;
  rides: RideListItem[];
  totalRides: number;
  totalEarnings: number;
};

export type RideHistory = {
  days: RideDay[];
  /**
   * Pass this back as `?loadMoreBefore=` for the next page. Null when there is
   * nothing older, which is what hides "Load earlier rides".
   */
  loadMoreBefore: string | null;
  /**
   * The week's totals, for the header. Not the page's and not the filter's —
   * it says "38 rides this week" however far the list has been scrolled.
   */
  thisWeek: {
    totalRides: number;
    totalEarnings: number;
  };
};

/** Everything the receipt screen shows. */
export type RideReceipt = {
  rideId: string;
  status: RideStatus;
  passengerName: string;
  /** "Signature" — what the ride was sold as. */
  rideClass: string;

  startTime: string;
  endTime: string;

  pickupAddress: string;
  destinationAddress: string;

  distanceInKm: number;
  durationInMinutes: number;
  waitingTimeInMinutes: number;

  /** The breakdown, in the order the receipt lists it. */
  totalFare: number;
  tipAmount: number;
  /** Positive here; the app draws the minus sign. */
  serviceFee: number;
  driverEarnings: number;

  paymentMethod: PaymentMethod;
  /** 0 while the money is still moving. */
  isPaymentSettled: 0 | 1;
};

export type EarningsPeriod = 'today' | 'week' | 'month';

/** One bar on the chart. */
export type EarningsDay = {
  date: string;
  earnings: number;
};

export type Earnings = {
  /** The headline: what the driver kept over the period. */
  totalEarnings: number;
  /**
   * How this period compares with the one before it, as a percentage. Null
   * when the previous period earned nothing, because the change is then not a
   * number anybody can render.
   */
  percentageChangeFromLastPeriod: number | null;

  /**
   * The bars, one per day in the period, zeroes included and in order. The
   * period's own dates are its first and last entries, and the peak the chart
   * marks is the largest — neither needs saying twice.
   */
  dailyEarnings: EarningsDay[];

  totalRides: number;
  /** Time available for work, not time on a trip. */
  onlineTimeInMinutes: number;
  /** totalEarnings ÷ totalRides, or null with no rides. */
  averageEarningsPerRide: number | null;

  /** The three lines under the chart. totalServiceFee is positive here. */
  breakdown: {
    totalFares: number;
    totalTips: number;
    totalServiceFee: number;
  };
};
