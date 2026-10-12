/**
 * Empties the development database.
 *
 * Recording the Postman collection walks one driver through the whole
 * application, which leaves them submitted. A second run would then find the
 * wrong state and record the wrong statuses, so this clears the tables first.
 *
 *   npm run db:reset
 *   npm run db:reset -- --admins   also clears the admin panel's accounts
 *
 * Admin accounts are left alone unless asked for: they have nothing to do
 * with a driver walkthrough, and clearing them signs you out of the panel.
 * If you do clear them, the next sign-up becomes Super Admin again.
 *
 * It refuses to run against anything but a development environment.
 */
import { createPool } from 'mysql2/promise';

/*
  These tools are destructive, and the app no longer carries an APP_ENV to tell
  environments apart. What is left that still says "this is a local database"
  is where it lives, so that is what is checked: a host off this machine is
  refused outright.
*/
const host = process.env.MYSQL_HOST ?? '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to touch a database on "${host}". This only runs against localhost.`);
  process.exit(1);
}

const pool = createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const alsoAdmins = process.argv.includes('--admins');

// Children first, so the foreign keys never object.
const tables = [
  'driver_documents',
  'driver_vehicles',
  'verified_sessions',
  'otp_challenges',
  'drivers',
  // Unrelated to the driver flow, so only on request.
  ...(alsoAdmins ? ['admin_users'] : []),
];

for (const table of tables) {
  const [result] = await pool.query(`DELETE FROM ${table}`);
  console.log(`  ${String(result.affectedRows).padStart(4)} rows  ${table}`);
}

await pool.end();

console.log(`\n${process.env.MYSQL_DATABASE}: every driver table is empty. Restart the dev server to reseed.`);
console.log(
  alsoAdmins
    ? 'Admin accounts were cleared too — the next sign-up becomes Super Admin.'
    : 'Admin accounts were kept. Pass --admins to clear those as well.',
);
