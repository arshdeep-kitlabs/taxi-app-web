import type { RowDataPacket } from 'mysql2/promise';
import type { VerifiedSession } from '../../../domain/verified-session.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type { VerifiedSessionRepository } from '../ports/verified-session-repository.port.js';

interface Row extends RowDataPacket {
  phone: string;
  driver_id: string;
  expires_at: number;
}

export class MysqlVerifiedSessionRepository implements VerifiedSessionRepository {
  constructor(private readonly db: Database) {}

  async find(phone: string): Promise<VerifiedSession | null> {
    const row = await firstRow<Row>(
      this.db,
      'SELECT phone, driver_id, expires_at FROM verified_sessions WHERE phone = ? LIMIT 1',
      [phone],
    );
    if (!row) return null;

    return { phone: row.phone, driverId: row.driver_id, expiresAt: Number(row.expires_at) };
  }

  async save(session: VerifiedSession): Promise<void> {
    await this.db.query(
      `INSERT INTO verified_sessions (phone, driver_id, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE driver_id = VALUES(driver_id), expires_at = VALUES(expires_at)`,
      [session.phone, session.driverId, session.expiresAt],
    );

    // These live for two minutes; sweeping them here keeps the table at the
    // handful of rows it should be.
    await this.db.query('DELETE FROM verified_sessions WHERE expires_at < ?', [Date.now()]);
  }

  async remove(phone: string): Promise<void> {
    await this.db.query('DELETE FROM verified_sessions WHERE phone = ?', [phone]);
  }
}
