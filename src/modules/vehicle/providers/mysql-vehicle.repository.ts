import type { RowDataPacket } from 'mysql2/promise';
import type { DriverVehicle } from '../../../domain/vehicle.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type { VehicleRepository } from '../ports/vehicle-repository.port.js';

interface Row extends RowDataPacket {
  driver_id: string;
  fields: unknown;
  updated_at: string;
}

/**
 * The car's typed details.
 *
 * Which details are asked for lives in configuration, so they are held by name
 * rather than as fixed columns and the set can grow without a migration.
 */
export class MysqlVehicleRepository implements VehicleRepository {
  constructor(private readonly db: Database) {}

  async findByDriver(driverId: string): Promise<DriverVehicle | null> {
    const row = await firstRow<Row>(
      this.db,
      'SELECT driver_id, fields, updated_at FROM driver_vehicles WHERE driver_id = ? LIMIT 1',
      [driverId],
    );
    if (!row) return null;

    return {
      driverId: row.driver_id,
      fields: (typeof row.fields === 'string' ? JSON.parse(row.fields) : (row.fields ?? {})) as Record<
        string,
        string
      >,
      updatedAt: new Date(`${row.updated_at.replace(' ', 'T')}Z`).toISOString(),
    };
  }

  async save(vehicle: DriverVehicle): Promise<DriverVehicle> {
    await this.db.query(
      `INSERT INTO driver_vehicles (driver_id, fields, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE fields = VALUES(fields), updated_at = VALUES(updated_at)`,
      [
        vehicle.driverId,
        JSON.stringify(vehicle.fields),
        new Date(vehicle.updatedAt).toISOString().slice(0, 23).replace('T', ' '),
      ],
    );

    return vehicle;
  }
}
