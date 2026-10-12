import { AppError } from '../../common/errors/app.error.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { DocumentRepository } from '../documents/ports/document-repository.port.js';
import type { RideRepository } from '../rides/ports/ride-repository.port.js';
import type { RidesService } from '../rides/rides.service.js';
import type { VehicleRepository } from '../vehicle/ports/vehicle-repository.port.js';
import type { Profile } from './profile.types.js';

export class ProfileService {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly vehicles: VehicleRepository,
    private readonly documents: DocumentRepository,
    private readonly rides: RideRepository,
    private readonly ridesService: RidesService,
    private readonly config: ConfigSource,
  ) {}

  async get(driverId: string): Promise<Profile> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    const [vehicle, documents, week, recent] = await Promise.all([
      this.vehicles.findByDriver(driverId),
      this.documents.findByDriver(driverId),
      this.ridesService.earnings(driverId, 'week'),
      // One row, only to read the class they were last sold as.
      this.rides.listForDriver(driverId, 1),
    ]);

    const expiries = this.expiryDates(documents?.documents ?? {});
    const warningDays = this.config.load().application.documentExpiryWarningDays;
    const warnBefore = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000);

    const fields = vehicle?.fields ?? {};
    const vehicleName = [fields.make, fields.model].filter(Boolean).join(' ') || null;

    return {
      name: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || null,
      gender: driver.gender,
      // No rating system exists, so this is honestly empty rather than zero.
      rating: driver.rating,
      totalRides: await this.countRides(driverId),
      memberSince: driver.createdAt,

      verification: {
        isVerified: driver.applicationStatus === 'approved' ? 1 : 0,
        rideClass: recent[0]?.serviceClass ?? null,
        renewsOn: expiries.length ? (expiries[0]!.toISOString().slice(0, 10) ?? null) : null,
      },

      account: {
        personalInformation:
          driver.applicationStatus === 'approved' ? 'verified' : driver.applicationStatus,
        vehicle: vehicleName,
        documentsExpiringCount: expiries.filter((date) => date <= warnBefore).length,
      },

      activity: {
        earningsThisWeek: week.totalEarnings,
        ridesThisWeek: week.totalRides,
      },
    };
  }

  /**
   * Counted, not read from `drivers.total_rides`.
   *
   * Nothing maintains that column — it says 0 for a driver with hundreds of
   * rides — so the table that holds the rides is the only honest source.
   */
  private async countRides(driverId: string): Promise<number> {
    const { rideCount } = await this.rides.totalsInWindow(driverId, {
      from: new Date(0),
      to: new Date(Date.now() + 86_400_000),
    });
    return rideCount;
  }

  /**
   * Every expiry a driver has given, soonest first.
   *
   * Only the fields config marks as a month are read, so adding an expiry to
   * another document needs no change here. A value in the past still counts —
   * it has expired, which is more urgent than expiring.
   */
  private expiryDates(saved: Record<string, { fields: Record<string, string> }>): Date[] {
    const specs = this.config.load().documents.documents;
    const dates: Date[] = [];

    for (const spec of specs) {
      for (const field of spec.fields) {
        if (field.type !== 'month') continue;
        const value = saved[spec.name]?.fields[field.name];
        if (!value) continue;

        // Stored as YYYY-MM; a licence is good until the end of that month.
        const [year, month] = value.split('-').map(Number);
        if (!year || !month) continue;
        dates.push(new Date(Date.UTC(year, month, 0)));
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }
}
