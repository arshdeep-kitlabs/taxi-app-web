import type { Ride, RideStatus } from '../../../domain/ride.js';

/** A half-open window: `from` inclusive, `to` exclusive. */
export type Window = { from: Date; to: Date };

/** What the totals under the earnings chart are summed from. */
export type RideTotals = {
  rideCount: number;
  fares: number;
  tips: number;
  serviceFee: number;
  net: number;
};

export interface RideRepository {
  findById(rideId: string): Promise<Ride | null>;

  /**
   * One page of a driver's rides, newest first.
   *
   * `before` is the `startedAt` of the last row already shown, so paging never
   * skips or repeats a row when one is written mid-scroll — which offsets do.
   */
  listForDriver(
    driverId: string,
    limit: number,
    before?: Date,
    status?: RideStatus,
  ): Promise<Ride[]>;

  /** Every ride that started inside the window, oldest first. */
  listInWindow(driverId: string, window: Window): Promise<Ride[]>;

  /** The same window, summed in the database rather than in memory. */
  totalsInWindow(driverId: string, window: Window): Promise<RideTotals>;

}

export interface ShiftRepository {
  /**
   * Minutes the driver was online inside the window.
   *
   * Shifts are clipped to the window, so one spanning midnight counts towards
   * both days rather than landing entirely in whichever it began.
   */
  onlineMinutesInWindow(driverId: string, window: Window): Promise<number>;

  /** The shift the driver is on right now, or null when they are offline. */
  openShift(driverId: string): Promise<OpenShift | null>;
  /**
   * Opens a shift, and answers with it. Already being online is not an error:
   * a driver who reconnects should not end up with two open shifts, so this
   * returns the one already running rather than starting a second.
   */
  startShift(driverId: string): Promise<OpenShift>;
  /** Closes the open shift, if there is one. Returns whether one was closed. */
  endShift(driverId: string): Promise<boolean>;
}

/** A shift that has begun and not yet ended. */
export type OpenShift = { id: string; startedAt: string };
