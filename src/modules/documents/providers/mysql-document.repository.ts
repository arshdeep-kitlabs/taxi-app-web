import type { RowDataPacket } from 'mysql2/promise';
import type { DriverDocument, DriverDocuments } from '../../../domain/document.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type { DocumentRepository } from '../ports/document-repository.port.js';

interface Row extends RowDataPacket {
  driver_id: string;
  documents: unknown;
  updated_at: string;
}

const parse = (value: unknown): Record<string, DriverDocument> =>
  (typeof value === 'string' ? JSON.parse(value) : (value ?? {})) as Record<string, DriverDocument>;

/**
 * A driver's uploads, kept as one JSON document.
 *
 * Which documents exist, and which slots and fields each has, comes from
 * configuration and changes without a release — so columns cannot follow it.
 * Everything is read and written per driver anyway, which is exactly the shape
 * a single row suits.
 */
export class MysqlDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Database) {}

  async findByDriver(driverId: string): Promise<DriverDocuments | null> {
    const row = await firstRow<Row>(
      this.db,
      'SELECT driver_id, documents, updated_at FROM driver_documents WHERE driver_id = ? LIMIT 1',
      [driverId],
    );
    if (!row) return null;

    return {
      driverId: row.driver_id,
      documents: parse(row.documents),
      updatedAt: new Date(`${row.updated_at.replace(' ', 'T')}Z`).toISOString(),
    };
  }

  async save(documents: DriverDocuments): Promise<DriverDocuments> {
    await this.db.query(
      `INSERT INTO driver_documents (driver_id, documents, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE documents = VALUES(documents), updated_at = VALUES(updated_at)`,
      [
        documents.driverId,
        JSON.stringify(documents.documents),
        new Date(documents.updatedAt).toISOString().slice(0, 23).replace('T', ' '),
      ],
    );

    return documents;
  }
}
