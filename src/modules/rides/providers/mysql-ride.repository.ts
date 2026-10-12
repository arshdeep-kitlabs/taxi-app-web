import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { PaymentMethod, Ride, RideStatus } from '../../../domain/ride.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type {
  OpenShift,
  RideRepository,
  RideTotals,
  ShiftRepository,
  Window,
} from '../ports/ride-repository.port.js';

interface RideDbRow extends RowDataPacket {
  id: string;
  driver_id: string;
  rider_name: string;
  status: RideStatus;
  service_class: string;
  pickup: string;
  dropoff: string;
  started_at: string;
  ended_at: string;
  distance_km: string;
  duration_minutes: number;
  wait_minutes: number;
  fare: string;
  tip: string;
  service_fee: string;
  net: string;
  payment_method: PaymentMethod;
  is_settled: number;
}

const COLUMNS = `id, driver_id, rider_name, status, service_class, pickup, dropoff,
  started_at, ended_at, distance_km, duration_minutes, wait_minutes,
  fare, tip, service_fee, net, payment_method, is_settled`;

/** MySQL hands DATETIME back without a zone; the API speaks ISO throughout. */
const toIso = (value: string | null): string | null =>
  value === null ? null : new Date(`${value.replace(' ', 'T')}Z`).toISOString();

function toRide(row: RideDbRow): Ride {
  return {
    id: row.id,
    driverId: row.driver_id,
    riderName: row.rider_name,
    status: row.status,
    serviceClass: row.service_class,
    pickup: row.pickup,
    dropoff: row.dropoff,
    startedAt: toIso(row.started_at)!,
    endedAt: toIso(row.ended_at)!,
    distanceKm: Number(row.distance_km),
    durationMinutes: row.duration_minutes,
    waitMinutes: row.wait_minutes,
    fare: Number(row.fare),
    tip: Number(row.tip),
    serviceFee: Number(row.service_fee),
    net: Number(row.net),
    paymentMethod: row.payment_method,
    isSettled: row.is_settled === 1 ? 1 : 0,
  };
}

/** DATETIME(3) takes a value without a zone, so UTC is written explicitly. */
const toMysql = (value: Date): string => value.toISOString().slice(0, 23).replace('T', ' ');

export class MysqlRideRepository implements RideRepository {
  constructor(private readonly database: Database) {}

  async findById(rideId: string): Promise<Ride | null> {
    const row = await firstRow<RideDbRow>(
      this.database,
      `SELECT ${COLUMNS} FROM rides WHERE id = ?`,
      [rideId],
    );
    return row ? toRide(row) : null;
  }

  async listForDriver(
    driverId: string,
    limit: number,
    before?: Date,
    status?: RideStatus,
  ): Promise<Ride[]> {
    // One extra row is asked for by the caller's limit, not here; this returns
    // exactly what it was asked for, newest first.
    const where = ['driver_id = ?'];
    const values: unknown[] = [driverId];

    if (before) {
      where.push('started_at < ?');
      values.push(toMysql(before));
    }
    if (status) {
      where.push('status = ?');
      values.push(status);
    }
    values.push(limit);

    const [rows] = await this.database.query<RideDbRow[]>(
      `SELECT ${COLUMNS} FROM rides
        WHERE ${where.join(' AND ')}
        ORDER BY started_at DESC
        LIMIT ?`,
      values,
    );
    return rows.map(toRide);
  }

  async listInWindow(driverId: string, window: Window): Promise<Ride[]> {
    const [rows] = await this.database.query<RideDbRow[]>(
      `SELECT ${COLUMNS} FROM rides
        WHERE driver_id = ? AND started_at >= ? AND started_at < ?
        ORDER BY started_at ASC`,
      [driverId, toMysql(window.from), toMysql(window.to)],
    );
    return rows.map(toRide);
  }

  async totalsInWindow(driverId: string, window: Window): Promise<RideTotals> {
    const row = await firstRow<RowDataPacket>(
      this.database,
      `SELECT COUNT(*)              AS ride_count,
              IFNULL(SUM(fare), 0)        AS fares,
              IFNULL(SUM(tip), 0)         AS tips,
              IFNULL(SUM(service_fee), 0) AS service_fee,
              IFNULL(SUM(net), 0)         AS net
         FROM rides
        WHERE driver_id = ? AND started_at >= ? AND started_at < ?`,
      [driverId, toMysql(window.from), toMysql(window.to)],
    );

    return {
      rideCount: Number(row?.ride_count ?? 0),
      fares: Number(row?.fares ?? 0),
      tips: Number(row?.tips ?? 0),
      serviceFee: Number(row?.service_fee ?? 0),
      net: Number(row?.net ?? 0),
    };
  }

}

export class MysqlShiftRepository implements ShiftRepository {
  constructor(private readonly database: Database) {}

  async onlineMinutesInWindow(driverId: string, window: Window): Promise<number> {
    // The overlap is clipped at both ends in SQL: a shift that began before the
    // window or has not ended yet still counts for the part inside it.
    const row = await firstRow<RowDataPacket>(
      this.database,
      `SELECT IFNULL(SUM(
                TIMESTAMPDIFF(
                  SECOND,
                  GREATEST(started_at, ?),
                  LEAST(IFNULL(ended_at, ?), ?)
                )
              ), 0) AS seconds
         FROM driver_shifts
        WHERE driver_id = ?
          AND started_at < ?
          AND IFNULL(ended_at, ?) > ?`,
      [
        toMysql(window.from),
        toMysql(window.to),
        toMysql(window.to),
        driverId,
        toMysql(window.to),
        toMysql(window.to),
        toMysql(window.from),
      ],
    );
    return Math.max(0, Math.round(Number(row?.seconds ?? 0) / 60));
  }

  async openShift(driverId: string): Promise<OpenShift | null> {
    // A null ended_at is what "still online" means. Newest first, so a row
    // left open by a crash long ago never shadows the current one.
    const row = await firstRow<RowDataPacket>(
      this.database,
      `SELECT id, started_at
         FROM driver_shifts
        WHERE driver_id = ? AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1`,
      [driverId],
    );
    return row ? { id: row.id as string, startedAt: toIsoString(row.started_at as string) } : null;
  }

  async startShift(driverId: string): Promise<OpenShift> {
    // Reconnecting is not a new shift. Returning the open one keeps
    // onlineTimeInMinutes honest, which would otherwise double-count every
    // overlap once two rows were open at the same time.
    const running = await this.openShift(driverId);
    if (running) return running;

    const startedAt = new Date();
    const id = `shf_${Math.random().toString(36).slice(2, 12)}`;
    await this.database.query(
      'INSERT INTO driver_shifts (id, driver_id, started_at) VALUES (?, ?, ?)',
      [id, driverId, toMysql(startedAt)],
    );
    return { id, startedAt: startedAt.toISOString() };
  }

  async endShift(driverId: string): Promise<boolean> {
    const [result] = await this.database.query<ResultSetHeader>(
      'UPDATE driver_shifts SET ended_at = ? WHERE driver_id = ? AND ended_at IS NULL',
      [toMysql(new Date()), driverId],
    );
    return result.affectedRows > 0;
  }
}

/** MySQL hands DATETIME back without a zone; the API speaks ISO throughout. */
function toIsoString(value: string): string {
  return new Date(`${value.replace(' ', 'T')}Z`).toISOString();
}

/**
 * Sample work for the reserved test drivers.
 *
 * Only ever called while ALLOW_TEST_ACCOUNTS is on, and only for a driver with
 * no rides yet, so it cannot overwrite anything real. It exists because the
 * earnings and history screens are unreadable against an empty table — there
 * is no booking system yet to produce rides the honest way.
 */
export async function seedDemoRides(database: Database, driverId: string): Promise<void> {
  const existing = await firstRow<RowDataPacket>(
    database,
    'SELECT 1 AS present FROM rides WHERE driver_id = ? LIMIT 1',
    [driverId],
  );
  if (existing) return;

  const riders = ['Amelia R.', 'Tomas L.', 'Priya M.', 'Marc D.', 'Sofia K.', 'Jonah B.'];
  const places: [string, string][] = [
    ['18 Devonshire Place, W1G', 'St Pancras International, N1C'],
    ['The Ned, EC2N', 'Canary Wharf, E14'],
    ['Soho House, W1D', 'Battersea Park, SW11'],
    ['Chiltern Street, W1U', 'Paddington Station, W2'],
    ['Kings Cross, N1C', 'Shoreditch High Street, E1'],
  ];
  const classes = ['Standard', 'Signature', 'Executive'];

  const rows: unknown[][] = [];
  const shifts: unknown[][] = [];
  let seq = 0;

  // Seven weeks back, so every period a screen can ask for has something in
  // it — including last month, which is what "% vs last period" needs to be a
  // number rather than a null on the month tab.
  for (let daysAgo = 48; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - daysAgo);

    // Three to six rides a day, varying by weekday so the chart has a shape.
    const count = 3 + ((day.getUTCDay() + daysAgo) % 4);

    const shiftStart = new Date(day);
    shiftStart.setUTCHours(7, 30, 0, 0);
    const shiftEnd = new Date(day);
    shiftEnd.setUTCHours(17, 45, 0, 0);
    shifts.push([`shf_${driverId}_${daysAgo}`, driverId, toMysql(shiftStart), toMysql(shiftEnd)]);

    for (let n = 0; n < count; n += 1) {
      seq += 1;
      const [pickup, dropoff] = places[seq % places.length]!;

      const startedAt = new Date(day);
      startedAt.setUTCHours(8 + n * 2, (seq * 7) % 60, 0, 0);

      // Every fifth ride is called off, which is what puts a cancellation in
      // the list with a fee and a wait instead of a distance.
      const cancelled = seq % 5 === 0;

      // Zero rather than absent on a cancellation: nothing was driven, and a
      // screen showing "—" for a number it can add up is a screen with a bug.
      const durationMinutes = cancelled ? 0 : 18 + ((seq * 3) % 25);
      const distanceKm = cancelled ? 0 : Math.round((3 + ((seq * 13) % 90) / 10) * 100) / 100;

      // Every ride has a wait at the pickup; on a cancellation it is longer,
      // and it is what earns the fee.
      const waitMinutes = cancelled ? 4 + (seq % 3) : 1 + (seq % 4);

      // A cancellation ends too — at the moment the driver gave up waiting.
      const endedAt = new Date(
        startedAt.getTime() + (cancelled ? waitMinutes : durationMinutes) * 60_000,
      );

      const fare = cancelled ? 6 : Math.round((14 + ((seq * 37) % 3400) / 100) * 100) / 100;
      // Roughly one ride in two is tipped, so the breakdown is never a zero.
      const tip = cancelled || seq % 2 !== 0 ? 0 : Math.round(((seq % 7) + 1.5) * 100) / 100;
      const serviceFee = cancelled ? 0 : Math.round(fare * 0.2 * 100) / 100;
      const net = Math.round((fare + tip - serviceFee) * 100) / 100;

      rows.push([
        `rid_${driverId}_${seq}`,
        driverId,
        riders[seq % riders.length]!,
        cancelled ? 'cancelled' : 'completed',
        classes[seq % classes.length]!,
        pickup,
        dropoff,
        toMysql(startedAt),
        toMysql(endedAt),
        distanceKm,
        durationMinutes,
        waitMinutes,
        fare,
        tip,
        serviceFee,
        net,
        seq % 6 === 0 ? 'cash' : 'card',
        daysAgo === 0 ? 0 : 1,
      ]);
    }
  }

  await database.query(
    `INSERT INTO rides (id, driver_id, rider_name, status, service_class, pickup, dropoff,
       started_at, ended_at, distance_km, duration_minutes, wait_minutes,
       fare, tip, service_fee, net, payment_method, is_settled)
     VALUES ?`,
    [rows],
  );

  await database.query(
    'INSERT INTO driver_shifts (id, driver_id, started_at, ended_at) VALUES ?',
    [shifts],
  );
}
