/**
 * Unlocks an application that has been submitted, so it can be edited again.
 *
 *   npm run db:unlock                 every driver
 *   npm run db:unlock 7000000000      one number
 *   npm run db:unlock +447000000000   the same, written in full
 *   npm run db:unlock drv_le6s2m5m    by driver id
 *
 * Submitting freezes every document, which is right in production and a
 * nuisance while testing: the upload calls answer APPLICATION_LOCKED and there
 * is no way back without an admin endpoint, which does not exist yet.
 *
 * This puts the application back to draft and clears the review. It leaves the
 * uploaded documents, the vehicle details and the reference alone — the driver
 * is where they were just before they pressed Submit.
 *
 * Refuses to run against anything but a development environment.
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

const target = process.argv[2];

const pool = createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// A number may be typed nationally or in full, so it is matched on its ending.
const where = target
  ? { sql: 'WHERE id = ? OR phone = ? OR phone LIKE ?', values: [target, target, `%${target.replace(/^\+/, '')}`] }
  : { sql: '', values: [] };

const [before] = await pool.query(
  `SELECT id, phone, application_status, reference FROM drivers ${where.sql}`,
  where.values,
);

if (before.length === 0) {
  console.log(target ? `No driver matches "${target}".` : 'There are no drivers.');
  await pool.end();
  process.exit(0);
}

const [result] = await pool.query(
  `UPDATE drivers
      SET application_status = 'draft',
          submitted_at = NULL,
          reviewed_at = NULL,
          rejected_documents = '[]'
    ${where.sql ? `${where.sql} AND` : 'WHERE'} application_status <> 'draft'`,
  where.values,
);

for (const driver of before) {
  const changed = driver.application_status !== 'draft';
  console.log(
    `  ${driver.phone.padEnd(16)} ${driver.application_status.padEnd(10)}` +
      `${changed ? '→ draft' : '  (already open)'}` +
      `${driver.reference ? `   ${driver.reference}` : ''}`,
  );
}

await pool.end();
console.log(
  `\n${result.affectedRows} unlocked. Documents, vehicle details and the reference are untouched.`,
);
