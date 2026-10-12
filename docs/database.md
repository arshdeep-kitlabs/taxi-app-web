# Database

MySQL. One database for development, one for production, never shared.

## Creating it

Run this once, as a MySQL user that may create databases (`sudo mysql`, or
`mysql -u root -p`). Choose your own password and put the same one in
`.env.development`.

```sql
CREATE DATABASE IF NOT EXISTS kit_taxi_driver_dev
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'kit_taxi'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON kit_taxi_driver_dev.* TO 'kit_taxi'@'localhost';
FLUSH PRIVILEGES;
```

Then in `.env.development`:

```
MYSQL_USER=kit_taxi
MYSQL_PASSWORD=choose-a-password
MYSQL_DATABASE=kit_taxi_driver_dev
```

`npm run dev` creates the tables itself on the first start. There is nothing
else to run.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server. Creates the tables on first run. |
| `npm run db:unlock [who]` | Puts a submitted application back to draft so it can be edited again. |
| `npm run db:reset` | Empties every table. |

Both `db:` commands refuse to run against a `MYSQL_HOST` that is not
loopback. There is no `APP_ENV` any more, so where the database lives is what
tells them this is a local one.

### Unlocking an application

Submitting freezes every document — right in production, a nuisance while
testing, because the upload calls then answer `APPLICATION_LOCKED` and nothing
reopens them until the admin endpoint exists.

```
npm run db:unlock                 every driver
npm run db:unlock 7000000000      one number
npm run db:unlock +447000000000   the same, written in full
npm run db:unlock drv_le6s2m5m    by driver id
```

```
  +447000000000    submitted → draft   KT-5848-GB

1 unlocked. Documents, vehicle details and the reference are untouched.
```

The driver is put back exactly where they were the moment before they pressed
Submit: everything they uploaded is still there, `canSubmit` is `1` again, and
submitting a second time reuses the same reference — it is the same case.

Use `db:reset` instead when you want to start from nothing, such as before
re-recording the Postman collection.

## The tables

| Table | Holds | Looked up by |
|---|---|---|
| `drivers` | The account and where its application stands | `phone`, `email`, `reference`, `id` |
| `otp_challenges` | A code waiting to be proved, and the sign-up form behind it | `phone` |
| `verified_sessions` | Two-minute proof that a number was just verified | `phone` |
| `driver_documents` | Everything the driver has uploaded | `driver_id` |
| `driver_vehicles` | The car's typed details | `driver_id` |
| `admin_users` | Who may sign in to the admin panel | `email`, `id`, `status` |
| `rides` | Finished work: one row per completed or cancelled ride | `driver_id` + `started_at`, `id` |
| `driver_shifts` | When a driver was online, for the earnings screen | `driver_id` + `started_at` |

### Indexes

Every column the code looks a row up by is indexed. Without them MySQL reads
the whole table on every sign-in — invisible with ten test drivers, painful
with ten thousand real ones.

- `drivers.phone` — unique. Read on every sign-in, and two accounts must never
  share a number.
- `drivers.email` — unique. The sign-up form checks the address is free.
- `drivers.reference` — unique. What a driver quotes to support.
- `drivers (application_status, submitted_at)` — the admin queue will list
  applications by state, newest first.
- `otp_challenges.expires_at`, `verified_sessions.expires_at` — both tables are
  swept of expired rows, which is a range scan on these.
- `admin_users.email` — unique. Read on every sign-in to the panel, and two
  admins must never share an address.
- `admin_users.status` — the pending-approval queue is a filter on this.
- `rides (driver_id, started_at)` — every read is "this driver's rides,
  newest first", paged on `started_at`. Without it each page scans the table.
- `driver_shifts (driver_id, started_at)` — the same shape, summed rather
  than listed.

A shift with a null `ended_at` is the driver being online right now. Rows are
written by `go_online` and `go_offline` over the WebSocket, and a dropped
connection closes the open one — see `docs/api-map.md`. A driver has at most
one open row: reconnecting returns the shift already running rather than
starting a second, because two overlapping rows would double-count
`onlineTimeInMinutes`.

### Gender-specific riding

Four columns on `drivers`, added by `applySchema` beside the rest:

| Column | Holds |
|---|---|
| `gender` | `MALE` · `FEMALE` · `OTHER`, or null. The driver's own answer from the sign-up form, or a reviewer's |
| `gender_verified_at` | When a reviewer confirmed it. Null means the driver said it and nobody has checked |
| `gender_specific_mode_enabled` | What the driver asked for — not necessarily what is happening |
| `passenger_gender_preference` | `ANY` · `FEMALE` · `MALE`, defaulting to `ANY` |

The gender and its stamp are two columns rather than one because a gender with
no date is an unfinished write, and treating that as verified would be the
wrong way to be wrong. Both are checked before the mode counts.

The toggle and the preference are also separate, so turning the mode off and
on again does not make the driver choose again.

Nothing here is cleared when the feature is switched off for everyone — that
flag lives in `config/app-config.json` and is read on every request, so a
driver's stored choice survives it and comes back by itself. `docs/api-map.md`
has the behaviour in full.

### Why documents are JSON rather than tables

Which documents exist, and which slots and fields each one has, comes from
`config/app-config.json` and changes without a release. Columns cannot follow
that: adding an ID type would mean a migration every time. Everything is read
and written per driver anyway, which is the shape a single row suits.

If the admin panel later needs to query across documents — "every application
waiting on an MOT certificate" — that is the point to normalise, and MySQL can
index inside a JSON column in the meantime.

## Admin accounts

Separate from `drivers` on purpose, and with no link between them: a driver
proves a phone number and is a customer of the platform, while an admin holds
a password and acts on other people's accounts. Nothing should be able to
confuse one for the other.

| Column | Holds |
|---|---|
| `password_hash` | scrypt, salted per row, in the form `scrypt$<salt>$<key>` |
| `role_id` | Unread. Kept with its default for when roles arrive — see below |
| `status` | `pending` · `active` · `suspended` · `rejected` |
| `last_login_at` | Set on every successful sign-in |

Only `active` may sign in. A new account is `pending` until an existing admin
approves it — except the very first one on an empty table, which is activated
as Super Admin because there is nobody to do the approving.

There are no roles yet: every active admin can do everything, and nothing
reads `role_id`. It stays in the table because `applySchema` only ever adds
columns, and because it has a `NOT NULL DEFAULT`, so writes that ignore it
still work. When roles arrive it is the column to pick back up.

### Clearing them

`npm run db:reset` leaves `admin_users` alone — an admin account has nothing
to do with a driver walkthrough, and clearing it signs you out of the panel.

```
npm run db:reset              every driver table, admins kept
npm run db:reset -- --admins  admins too; the next sign-up becomes Super Admin
```

## Rides

One row per finished ride. Nothing writes one until the ride is over, so there
is no `in_progress` state to filter out.

| Column | Holds |
|---|---|
| `fare`, `tip`, `service_fee`, `net` | Money as it stood on the day — see below |
| `distance_km`, `duration_minutes` | Zero on a cancellation — nothing was driven |
| `wait_minutes` | The wait at the pickup. On a cancellation it earns the fee |
| `is_settled` | 0 while the money is still moving |

**`net` is stored, not derived.** It could be computed from the other three,
and deliberately is not: a receipt is a historical record, and a later change
to the fee rate must not rewrite what a driver was already paid.

`driver_shifts` is separate because "online" is not "on a trip" — the gap
between two jobs is time worked, and the earnings screen counts it. Shifts are
clipped to the window being asked about, so one spanning midnight counts
towards both days.

### Sample rides in development

`ALLOW_TEST_ACCOUNTS` seeds seven weeks of rides and shifts for each reserved
number, and only for a driver with no rides yet. Seven weeks rather than one
so that every period a screen can ask for has something behind it — including
last month, which the month tab compares against. The earnings and history
screens are unreadable against an empty table, and nothing books a ride yet.

## Redis

Not used. The OTP challenges and verified sessions are the parts that would
suit it — both are short-lived and expire on their own — but they are small,
they are swept as they are written, and MySQL handles them comfortably at this
size. Both sit behind their own interfaces, so moving them to Redis later is a
new class and one line in `container.ts`, not a rewrite.
