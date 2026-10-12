import type { Driver } from '../../../domain/driver.js';

/**
 * Narrow on purpose: sign-in only needs to look a driver up. Nothing here lets
 * a caller write one, and swapping this for a database changes no service.
 */
export interface DriverRepository {
  findById(id: string): Promise<Driver | null>;
  findByPhone(phone: string): Promise<Driver | null>;
  findByEmail(email: string): Promise<Driver | null>;
  /** Every driver. Only the development seeder asks for this. */
  listAll(): Promise<Driver[]>;
  findByReference(reference: string): Promise<Driver | null>;
  create(driver: Driver): Promise<Driver>;
  update(driver: Driver): Promise<Driver>;
}
