import type { RowDataPacket } from 'mysql2/promise';
import type { AdminStatus, AdminUser } from '../../../domain/admin-user.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type {
  AdminUserRepository,
  NewAdminUser,
  StoredAdminUser,
} from '../ports/admin-user-repository.port.js';

interface AdminUserDbRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  status: AdminStatus;
  created_at: string;
  last_login_at: string | null;
}

/** The columns every read selects, so one mapper covers them all. */
const COLUMNS = 'id, email, password_hash, name, status, created_at, last_login_at';

function toAdminUser(row: AdminUserDbRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export class MysqlAdminUserRepository implements AdminUserRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<StoredAdminUser | null> {
    const row = await firstRow<AdminUserDbRow>(
      this.database,
      `SELECT ${COLUMNS} FROM admin_users WHERE email = ?`,
      [email],
    );
    if (!row) return null;
    return { ...toAdminUser(row), passwordHash: row.password_hash };
  }

  async findById(id: string): Promise<AdminUser | null> {
    const row = await firstRow<AdminUserDbRow>(
      this.database,
      `SELECT ${COLUMNS} FROM admin_users WHERE id = ?`,
      [id],
    );
    return row ? toAdminUser(row) : null;
  }

  async create(user: NewAdminUser): Promise<AdminUser> {
    const createdAt = new Date();
    await this.database.query(
      `INSERT INTO admin_users (id, email, password_hash, name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.passwordHash, user.name, user.status, createdAt],
    );

    // Read back rather than reconstruct, so the caller gets exactly what was
    // stored — including how MySQL rendered the timestamp.
    const created = await this.findById(user.id);
    if (!created) throw new Error(`admin_users row ${user.id} vanished after insert`);
    return created;
  }

  async isEmpty(): Promise<boolean> {
    // LIMIT 1 rather than COUNT(*): this only ever asks whether any row exists,
    // and it is called on every sign-up.
    const row = await firstRow<RowDataPacket>(
      this.database,
      'SELECT 1 AS present FROM admin_users LIMIT 1',
      [],
    );
    return row === null;
  }

  async list(): Promise<AdminUser[]> {
    const [rows] = await this.database.query<AdminUserDbRow[]>(
      // Pending first: the queue is the reason anyone opens this list.
      `SELECT ${COLUMNS} FROM admin_users
        ORDER BY status = 'pending' DESC, created_at DESC`,
    );
    return rows.map(toAdminUser);
  }

  async setStatus(id: string, status: AdminStatus): Promise<AdminUser | null> {
    await this.database.query('UPDATE admin_users SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  async markSignedIn(id: string): Promise<void> {
    await this.database.query('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [
      new Date(),
      id,
    ]);
  }
}
