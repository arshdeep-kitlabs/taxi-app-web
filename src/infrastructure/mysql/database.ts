import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';

/**
 * The connection every repository shares.
 *
 * A pool rather than a connection: requests overlap, and one connection would
 * serialise them. The repositories above speak only to their own interfaces,
 * so nothing outside this folder knows the database is MySQL.
 */
export type Database = Pool;

type DatabaseOptions = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

export function openDatabase(options: DatabaseOptions): Database {
  return createPool({
    ...options,
    waitForConnections: true,
    // Keeps a slow query from queueing forever behind an exhausted pool.
    queueLimit: 0,
    // Dates and decimals come back as strings rather than as objects the
    // application would have to re-parse.
    dateStrings: true,
    charset: 'utf8mb4_general_ci',
  });
}

/** Convenience for the many reads that want one row or none. */
export async function firstRow<T extends RowDataPacket>(
  database: Database,
  sql: string,
  values: unknown[],
): Promise<T | null> {
  const [rows] = await database.query<T[]>(sql, values);
  return rows[0] ?? null;
}
