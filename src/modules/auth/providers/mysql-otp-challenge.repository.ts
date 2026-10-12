import type { RowDataPacket } from 'mysql2/promise';
import type { OtpChallenge, PendingSignUp } from '../../../domain/otp-challenge.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type { OtpChallengeRepository } from '../ports/otp-challenge-repository.port.js';

interface Row extends RowDataPacket {
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  resend_after: number;
  pending: unknown;
}

export class MysqlOtpChallengeRepository implements OtpChallengeRepository {
  constructor(private readonly db: Database) {}

  async find(phone: string): Promise<OtpChallenge | null> {
    const row = await firstRow<Row>(
      this.db,
      `SELECT phone, code_hash, attempts, expires_at, resend_after, pending
       FROM otp_challenges WHERE phone = ? LIMIT 1`,
      [phone],
    );
    if (!row) return null;

    return {
      phone: row.phone,
      codeHash: row.code_hash,
      attempts: row.attempts,
      // BIGINT arrives as a string on some drivers.
      expiresAt: Number(row.expires_at),
      resendAfter: Number(row.resend_after),
      pending:
        row.pending === null
          ? null
          : ((typeof row.pending === 'string'
              ? JSON.parse(row.pending)
              : row.pending) as PendingSignUp),
    };
  }

  async save(challenge: OtpChallenge): Promise<void> {
    await this.db.query(
      `INSERT INTO otp_challenges (phone, code_hash, attempts, expires_at, resend_after, pending)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         code_hash = VALUES(code_hash),
         attempts = VALUES(attempts),
         expires_at = VALUES(expires_at),
         resend_after = VALUES(resend_after),
         pending = VALUES(pending)`,
      [
        challenge.phone,
        challenge.codeHash,
        challenge.attempts,
        challenge.expiresAt,
        challenge.resendAfter,
        challenge.pending === null ? null : JSON.stringify(challenge.pending),
      ],
    );

    // Cheap housekeeping on a table that only ever holds pending codes: a
    // challenge nobody proved is of no use to anyone once it has expired.
    await this.db.query('DELETE FROM otp_challenges WHERE expires_at < ?', [Date.now()]);
  }

  async remove(phone: string): Promise<void> {
    await this.db.query('DELETE FROM otp_challenges WHERE phone = ?', [phone]);
  }
}
