import { AppError } from '../../common/errors/app.error.js';
import type { Ride, RideStatus } from '../../domain/ride.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import { dayKey, daysBetween, endOfDay, shiftDay, startOfDay, weekdayOf } from './local-day.js';
import type {
  RideRepository,
  ShiftRepository,
  Window,
} from './ports/ride-repository.port.js';
import type {
  Earnings,
  EarningsPeriod,
  RideDay,
  RideHistory,
  RideListItem,
  RideReceipt,
} from './rides.types.js';

/** How many rides a page of history holds. */
const PAGE_SIZE = 20;

/** Money rounded the way it is stored, so totals never drift by a penny. */
const money = (value: number): number => Math.round(value * 100) / 100;

export class RidesService {
  constructor(
    private readonly rides: RideRepository,
    private readonly shifts: ShiftRepository,
    private readonly config: ConfigSource,
  ) {}

  private get timeZone(): string {
    return this.config.load().timezone;
  }

  // ─── History ──────────────────────────────────────────────────────────────

  /**
   * A page of the driver's rides, grouped into local days.
   *
   * The grouping is done here rather than in the app because which day a ride
   * belongs to is a timezone question, and the per-day totals have to agree
   * with it.
   */
  async history(
    driverId: string,
    loadMoreBefore?: string,
    status?: RideStatus,
  ): Promise<RideHistory> {
    const cursor = loadMoreBefore ? new Date(loadMoreBefore) : undefined;
    if (cursor && Number.isNaN(cursor.getTime())) {
      throw AppError.validation({ loadMoreBefore: 'INVALID_FORMAT' });
    }

    // One more than a page, so "is there another page" needs no second query.
    const rows = await this.rides.listForDriver(driverId, PAGE_SIZE + 1, cursor, status);
    const page = rows.slice(0, PAGE_SIZE);
    const hasMore = rows.length > PAGE_SIZE;

    const days = new Map<string, RideListItem[]>();
    for (const ride of page) {
      const key = dayKey(new Date(ride.startedAt), this.timeZone);
      const bucket = days.get(key);
      if (bucket) bucket.push(this.toListItem(ride));
      else days.set(key, [this.toListItem(ride)]);
    }

    const grouped: RideDay[] = [...days.entries()].map(([date, items]) => ({
      date,
      rides: items,
      totalRides: items.length,
      totalEarnings: money(items.reduce((total, item) => total + item.driverEarnings, 0)),
    }));

    // The header counts the week, not the page and not the filter — it says
    // "38 rides this week" however far the list has been scrolled and
    // whichever status is being looked at.
    const week = this.windowFor('week');
    const totals = await this.rides.totalsInWindow(driverId, week.window);

    return {
      days: grouped,
      loadMoreBefore: hasMore ? (page[page.length - 1]?.startedAt ?? null) : null,
      thisWeek: {
        totalRides: totals.rideCount,
        totalEarnings: money(totals.net),
      },
    };
  }

  // ─── One receipt ──────────────────────────────────────────────────────────

  async receipt(driverId: string, rideId: string): Promise<RideReceipt> {
    const ride = await this.rides.findById(rideId);

    // Same answer whether the ride does not exist or belongs to someone else,
    // so an id cannot be probed for.
    if (!ride || ride.driverId !== driverId) throw AppError.notFound('RIDE_NOT_FOUND');

    return {
      rideId: ride.id,
      status: ride.status,
      passengerName: ride.riderName,
      rideClass: ride.serviceClass,
      startTime: ride.startedAt,
      endTime: ride.endedAt,
      pickupAddress: ride.pickup,
      destinationAddress: ride.dropoff,
      distanceInKm: ride.distanceKm,
      durationInMinutes: ride.durationMinutes,
      waitingTimeInMinutes: ride.waitMinutes,
      totalFare: ride.fare,
      tipAmount: ride.tip,
      serviceFee: ride.serviceFee,
      driverEarnings: ride.net,
      paymentMethod: ride.paymentMethod,
      isPaymentSettled: ride.isSettled,
    };
  }

  // ─── Earnings ─────────────────────────────────────────────────────────────

  async earnings(driverId: string, period: EarningsPeriod): Promise<Earnings> {
    const current = this.windowFor(period);
    const previous = this.previousWindowFor(period);

    const [totals, priorTotals, onlineMinutes, rides] = await Promise.all([
      this.rides.totalsInWindow(driverId, current.window),
      this.rides.totalsInWindow(driverId, previous.window),
      this.shifts.onlineMinutesInWindow(driverId, current.window),
      this.rides.listInWindow(driverId, current.window),
    ]);

    // Every day in the window gets a bar, including the ones that earned
    // nothing — a gap in the chart would read as missing data, not a day off.
    const perDay = new Map(daysBetween(current.from, current.to).map((date) => [date, 0]));
    for (const ride of rides) {
      const key = dayKey(new Date(ride.startedAt), this.timeZone);
      perDay.set(key, (perDay.get(key) ?? 0) + ride.net);
    }

    const dailyEarnings = [...perDay.entries()].map(([date, net]) => ({
      date,
      earnings: money(net),
    }));

    return {
      totalEarnings: money(totals.net),
      percentageChangeFromLastPeriod:
        priorTotals.net > 0
          ? Math.round(((totals.net - priorTotals.net) / priorTotals.net) * 1000) / 10
          : null,
      dailyEarnings,
      totalRides: totals.rideCount,
      onlineTimeInMinutes: onlineMinutes,
      averageEarningsPerRide:
        totals.rideCount > 0 ? money(totals.net / totals.rideCount) : null,
      breakdown: {
        totalFares: money(totals.fares),
        totalTips: money(totals.tips),
        totalServiceFee: money(totals.serviceFee),
      },
    };
  }

  // ─── Windows ──────────────────────────────────────────────────────────────

  /**
   * The local days a period covers, and the instants that bound them.
   *
   * A week runs Monday to Sunday because that is the order the chart draws,
   * and a month is the calendar one rather than the last thirty days.
   */
  private windowFor(period: EarningsPeriod): { from: string; to: string; window: Window } {
    const today = dayKey(new Date(), this.timeZone);

    if (period === 'today') return this.span(today, today);

    if (period === 'week') {
      const start = shiftDay(today, -(weekdayOf(today, this.timeZone) - 1));
      return this.span(start, shiftDay(start, 6));
    }

    const start = `${today.slice(0, 7)}-01`;
    // The day before the first of next month, whatever length this one is.
    const nextMonth = shiftDay(`${today.slice(0, 7)}-28`, 7);
    return this.span(start, shiftDay(`${nextMonth.slice(0, 7)}-01`, -1));
  }

  /** The same length of window, immediately before the current one. */
  private previousWindowFor(period: EarningsPeriod): { from: string; to: string; window: Window } {
    const current = this.windowFor(period);

    if (period === 'today') {
      const yesterday = shiftDay(current.from, -1);
      return this.span(yesterday, yesterday);
    }
    if (period === 'week') {
      const start = shiftDay(current.from, -7);
      return this.span(start, shiftDay(start, 6));
    }

    const end = shiftDay(current.from, -1);
    return this.span(`${end.slice(0, 7)}-01`, end);
  }

  private span(from: string, to: string): { from: string; to: string; window: Window } {
    return {
      from,
      to,
      window: { from: startOfDay(from, this.timeZone), to: endOfDay(to, this.timeZone) },
    };
  }

  private toListItem(ride: Ride): RideListItem {
    return {
      rideId: ride.id,
      startTime: ride.startedAt,
      passengerName: ride.riderName,
      status: ride.status,
      pickupAddress: ride.pickup,
      destinationAddress: ride.dropoff,
      driverEarnings: ride.net,
      distanceInKm: ride.distanceKm,
      durationInMinutes: ride.durationMinutes,
      waitingTimeInMinutes: ride.waitMinutes,
    };
  }
}
