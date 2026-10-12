import type { DriverDocuments } from '../../../domain/document.js';

export interface DocumentRepository {
  findByDriver(driverId: string): Promise<DriverDocuments | null>;
  save(documents: DriverDocuments): Promise<DriverDocuments>;
}
