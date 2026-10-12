import type { DriverVehicle } from '../../../domain/vehicle.js';

export interface VehicleRepository {
  findByDriver(driverId: string): Promise<DriverVehicle | null>;
  save(vehicle: DriverVehicle): Promise<DriverVehicle>;
}
