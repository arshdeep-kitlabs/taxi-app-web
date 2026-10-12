import type { Database } from './database.js';

/**
 * The tables, applied on every boot.
 *
 * Every statement is safe to run twice, so starting the server is the whole
 * migration story until the schema starts changing in ways that need real
 * migrations behind them.
 *
 * On indexes: every column the code actually looks a row up by is indexed.
 * Without them MySQL reads the whole table for each sign-in, which is
 * invisible with ten test drivers and painful with ten thousand real ones.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS drivers (
     id                  VARCHAR(64)  NOT NULL,
     -- The number behind the DR-0001 the admin panel shows. Sequential so a
     -- reviewer can read one out, unlike the random id.
     driver_number       INT          NOT NULL AUTO_INCREMENT,
     phone               VARCHAR(20)  NOT NULL,
     email               VARCHAR(320) NULL,
     first_name          VARCHAR(120) NULL,
     last_name           VARCHAR(120) NULL,
     date_of_birth       DATE         NULL,
     accepted_terms_at   DATETIME(3)  NULL,
     receive_promotions  TINYINT(1)   NOT NULL DEFAULT 0,
     created_at          DATETIME(3)  NOT NULL,
     application_status  ENUM('draft','submitted','in_review','changes_requested','approved','rejected')
                           NOT NULL DEFAULT 'draft',
     reference           VARCHAR(32)  NULL,
     submitted_at        DATETIME(3)  NULL,
     reviewed_at         DATETIME(3)  NULL,
     rejected_documents  JSON         NOT NULL,
     -- What the admin directory lists beside the account. Empty until there
     -- is a rides system to fill it.
     city                VARCHAR(120) NULL,
     rating              DECIMAL(3,2) NULL,
     total_rides         INT          NOT NULL DEFAULT 0,
     earnings            DECIMAL(12,2) NOT NULL DEFAULT 0,
     -- Whether the account itself may operate, which is a separate question
     -- from where their application stands.
     account_status      ENUM('active','suspended','blocked') NOT NULL DEFAULT 'active',
     PRIMARY KEY (id),
     UNIQUE KEY drivers_number (driver_number),
     -- Sign-in looks a driver up by number on every single call, and two
     -- accounts must never share one.
     UNIQUE KEY drivers_phone (phone),
     -- The sign-up form checks the address is free; the reference is what a
     -- driver quotes to support. Both are looked up, both must be unique.
     UNIQUE KEY drivers_email (email),
     UNIQUE KEY drivers_reference (reference),
     -- The admin queue will list applications by state, newest first.
     KEY drivers_status_submitted (application_status, submitted_at),
     -- The directory filters by account state and lists newest first.
     KEY drivers_account_status (account_status, created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS otp_challenges (
     phone         VARCHAR(20) NOT NULL,
     code_hash     CHAR(64)    NOT NULL,
     attempts      TINYINT     NOT NULL DEFAULT 0,
     expires_at    BIGINT      NOT NULL,
     resend_after  BIGINT      NOT NULL,
     pending       JSON        NULL,
     PRIMARY KEY (phone),
     -- Expired challenges are swept in bulk, which is a range scan on this.
     KEY otp_challenges_expires (expires_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS verified_sessions (
     phone       VARCHAR(20) NOT NULL,
     driver_id   VARCHAR(64) NOT NULL,
     expires_at  BIGINT      NOT NULL,
     PRIMARY KEY (phone),
     KEY verified_sessions_expires (expires_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Which documents exist, and which slots and fields each has, comes from
  // configuration and changes without a release. Columns cannot follow that,
  // so a driver's uploads are kept as one JSON document rather than shredded
  // into tables the next configuration edit would invalidate.
  `CREATE TABLE IF NOT EXISTS admin_users (
     id             VARCHAR(64)  NOT NULL,
     email          VARCHAR(320) NOT NULL,
     -- scrypt, salted per row. Never a plaintext or a reversible form.
     password_hash  VARCHAR(255) NOT NULL,
     name           VARCHAR(160) NOT NULL,
     -- Kept, unread: there are no roles yet, every active admin can do
     -- everything, and nothing here drops a column. It has a default, so a
     -- write that ignores it still works, and roles can pick it back up.
     role_id        VARCHAR(32)  NOT NULL DEFAULT 'ROLE-1',
     -- A new account is 'pending' and cannot sign in until an admin approves
     -- it. The first account ever created skips straight to 'active', because
     -- otherwise there is nobody to do the approving.
     status         ENUM('pending','active','suspended','rejected')
                      NOT NULL DEFAULT 'pending',
     created_at     DATETIME(3)  NOT NULL,
     last_login_at  DATETIME(3)  NULL,
     PRIMARY KEY (id),
     -- Read on every sign-in, and two admins must never share an address.
     UNIQUE KEY admin_users_email (email),
     -- The pending queue is a filter on this.
     KEY admin_users_status (status)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS driver_documents (
     driver_id   VARCHAR(64) NOT NULL,
     documents   JSON        NOT NULL,
     updated_at  DATETIME(3) NOT NULL,
     PRIMARY KEY (driver_id),
     CONSTRAINT driver_documents_driver
       FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS rides (
     id                VARCHAR(64)  NOT NULL,
     driver_id         VARCHAR(64)  NOT NULL,
     rider_name        VARCHAR(160) NOT NULL,
     status            ENUM('completed','cancelled') NOT NULL,
     service_class     VARCHAR(40)  NOT NULL,
     pickup            VARCHAR(255) NOT NULL,
     -- Set on a cancellation too: the passenger asked for somewhere, and the
     -- history screen shows it.
     dropoff           VARCHAR(255) NOT NULL,
     started_at        DATETIME(3)  NOT NULL,
     -- A cancellation ends as well, so every finished ride has both.
     ended_at          DATETIME(3)  NOT NULL,
     -- Zero on a cancellation: nothing was driven. An absence would be a
     -- different claim, and one no screen wants to handle.
     distance_km       DECIMAL(6,2) NOT NULL DEFAULT 0,
     duration_minutes  INT          NOT NULL DEFAULT 0,
     -- The wait at the pickup. On a cancellation it is what earns the fee.
     wait_minutes      INT          NOT NULL DEFAULT 0,
     -- Money as it stood on the day. Stored rather than recomputed, so a later
     -- change to the fee rate cannot rewrite what a driver was already paid.
     fare              DECIMAL(10,2) NOT NULL DEFAULT 0,
     tip               DECIMAL(10,2) NOT NULL DEFAULT 0,
     service_fee       DECIMAL(10,2) NOT NULL DEFAULT 0,
     net               DECIMAL(10,2) NOT NULL DEFAULT 0,
     payment_method    ENUM('card','cash') NOT NULL DEFAULT 'card',
     is_settled        TINYINT(1)   NOT NULL DEFAULT 1,
     PRIMARY KEY (id),
     -- Every read is "this driver's rides, newest first", which is this index.
     KEY rides_driver_time (driver_id, started_at),
     CONSTRAINT rides_driver
       FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS driver_shifts (
     id          VARCHAR(64) NOT NULL,
     driver_id   VARCHAR(64) NOT NULL,
     started_at  DATETIME(3) NOT NULL,
     -- Null while the driver is still online.
     ended_at    DATETIME(3) NULL,
     PRIMARY KEY (id),
     KEY driver_shifts_driver_time (driver_id, started_at),
     CONSTRAINT driver_shifts_driver
       FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS driver_vehicles (
     driver_id   VARCHAR(64) NOT NULL,
     fields      JSON        NOT NULL,
     updated_at  DATETIME(3) NOT NULL,
     PRIMARY KEY (driver_id),
     CONSTRAINT driver_vehicles_driver
       FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Columns added after the table first shipped.
 *
 * MySQL has no ADD COLUMN IF NOT EXISTS, so each is checked before it is
 * added. This is a stand-in for real migrations, and it holds only while every
 * change is additive.
 */
const LATER_COLUMNS: { table: string; column: string; definition: string }[] = [
  {
    table: 'drivers',
    column: 'driver_number',
    // AUTO_INCREMENT has to be part of a key, so the unique index is declared
    // inline. Existing rows are numbered in the order they were created.
    definition: 'INT NOT NULL AUTO_INCREMENT UNIQUE FIRST',
  },
  { table: 'drivers', column: 'city', definition: 'VARCHAR(120) NULL AFTER rejected_documents' },
  { table: 'drivers', column: 'rating', definition: 'DECIMAL(3,2) NULL AFTER city' },
  { table: 'drivers', column: 'total_rides', definition: 'INT NOT NULL DEFAULT 0 AFTER rating' },
  { table: 'drivers', column: 'earnings', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_rides' },
  {
    table: 'drivers',
    column: 'rejection',
    // Nullable, because it exists only while an application is sent back.
    definition: 'JSON NULL AFTER rejected_documents',
  },
  {
    table: 'drivers',
    column: 'account_status',
    definition: "ENUM('active','suspended','blocked') NOT NULL DEFAULT 'active' AFTER earnings",
  },
  {
    table: 'drivers',
    // Verified, not self-declared: it is set by an admin against the ID the
    // driver already supplied, which is what makes it worth matching on.
    column: 'gender',
    definition: "ENUM('MALE','FEMALE','OTHER') NULL AFTER account_status",
  },
  {
    table: 'drivers',
    column: 'gender_verified_at',
    definition: 'DATETIME(3) NULL AFTER gender',
  },
  {
    table: 'drivers',
    // The driver's master switch for the feature.
    column: 'gender_specific_mode_enabled',
    definition: 'TINYINT(1) NOT NULL DEFAULT 0 AFTER gender_verified_at',
  },
  {
    table: 'drivers',
    // Who they will carry. Only consulted while the mode above is on.
    column: 'passenger_gender_preference',
    definition: "ENUM('ANY','FEMALE','MALE') NOT NULL DEFAULT 'ANY' AFTER gender_specific_mode_enabled",
  },
];

/**
 * Columns whose definition changed after the table first shipped.
 *
 * Widening an ENUM is safe on a live table — no existing value is removed, so
 * every stored row stays valid.
 */
const CHANGED_COLUMNS: { table: string; column: string; contains: string; definition: string }[] = [
  {
    table: 'drivers',
    column: 'application_status',
    contains: 'in_review',
    definition:
      "ENUM('draft','submitted','in_review','changes_requested','approved','rejected') " +
      "NOT NULL DEFAULT 'draft'",
  },
];

export async function applySchema(database: Database): Promise<void> {
  for (const statement of STATEMENTS) {
    await database.query(statement);
  }

  for (const { table, column, definition } of LATER_COLUMNS) {
    const [rows] = await database.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column],
    );
    if ((rows as unknown[]).length === 0) {
      await database.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`[schema] added ${table}.${column}`);
    }
  }

  for (const { table, column, contains, definition } of CHANGED_COLUMNS) {
    // information_schema hands its column names back in upper case, whatever
    // case the query asked for, so it is aliased rather than guessed at.
    const [rows] = await database.query(
      `SELECT column_type AS definition FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column],
    );
    const current = (rows as { definition: string }[])[0]?.definition ?? '';
    if (current && !current.includes(contains)) {
      await database.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
      console.log(`[schema] widened ${table}.${column}`);
    }
  }
}
