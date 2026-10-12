# Where each endpoint lives

Every endpoint has its own folder, numbered in the order a driver meets them.
The numbers match the Postman folders, so a request and its code sit in the same
place under the same name.

| # | Endpoint | Folder | Auth |
|---|---|---|---|
| 01 | `GET /config` | `src/api/driver/01-config/` | public |
| 02 | `POST /requestOTP` | `src/api/driver/02-request-otp/` | public |
| 03 | `POST /signup` | `src/api/driver/03-signup/` | public |
| 04 | `POST /verifyOTP` | `src/api/driver/04-verify-otp/` | public |
| 05 | `GET /session` | `src/api/driver/05-session/` | verified number, then access token |
| 06 | `POST /refresh` | `src/api/driver/06-refresh/` | refresh token, in the body |
| 07 | `PATCH /documents` | `src/api/driver/07-documents/` | access token |
| 08 | `GET /review` | `src/api/driver/08-review/` | access token |
| 09 | `POST /submit` | `src/api/driver/09-submit/` | access token |
| 10 | `GET /trackStatus` | `src/api/driver/10-track-status/` | access token |
| 11 | `GET /rides` | `src/api/driver/11-rides/` | access token |
| 11 | `GET /rides/:rideId` | `src/api/driver/11-rides/` | access token |
| 12 | `GET /earnings` | `src/api/driver/12-earnings/` | access token |
| 13 | `GET /profile` | `src/api/driver/13-profile/` | access token |
| 14 | `GET /ridePreferences` | `src/api/driver/14-ride-preferences/` | access token |
| 14 | `PATCH /ridePreferences` | `src/api/driver/14-ride-preferences/` | access token |

The admin panel's endpoints sit beside them in `src/api/admin/`. They are not
numbered, because staff do not meet them in an order:

| Endpoint | Folder | Auth |
|---|---|---|
| `POST /admin/signup` | `src/api/admin/auth/` | public |
| `POST /admin/login` | `src/api/admin/auth/` | public |
| `GET /admin/me` | `src/api/admin/auth/` | admin token |
| `GET /admin/users` | `src/api/admin/users/` | admin token |
| `PATCH /admin/users/:adminId` | `src/api/admin/users/` | admin token |
| `GET /admin/drivers` | `src/api/admin/drivers/` | admin token |
| `GET /admin/drivers/:driverId` | `src/api/admin/drivers/` | admin token |
| `PATCH /admin/drivers/:driverId` | `src/api/admin/drivers/` | admin token |
| `GET /admin/config` | `src/api/admin/config/` | admin token |
| `PUT /admin/config` | `src/api/admin/config/` | admin token |
| `GET /admin/applications` | `src/api/admin/applications/` | admin token |
| `GET /admin/applications/:driverId` | `src/api/admin/applications/` | admin token |
| `PATCH /admin/applications/:driverId` | `src/api/admin/applications/` | admin token |

An admin token is a different `kind` from a driver's, so neither opens the
other's endpoints however it was obtained. `requireAdmin` also re-reads the
account on every request, so suspending someone takes effect on their next
call rather than when their token expires.

There are no roles: every active admin can do everything above. The unread
`admin_users.role_id` column is waiting for them.

## Getting into the admin panel

```
POST /admin/signup   { name, email, password }
   ├─ the first account ever → active, as Super Admin
   └─ every account after    → pending, and cannot sign in
POST /admin/login    { email, password }
   ├─ 200  { token, expiresIn, admin }
   └─ 403  ADMIN_PENDING_APPROVAL · ADMIN_SUSPENDED · ADMIN_REJECTED
GET  /admin/me       rehydrates a stored token, and re-checks the status
PATCH /admin/users/:adminId   { status: 'active' }  approves someone
```

Passwords are scrypt-hashed in `modules/admin-auth/password.ts`. An account's
status is checked on every `/admin/me`, not just at sign-in, so suspending
somebody takes effect on their next page load rather than when their token
runs out.

Each endpoint folder holds the same kinds of file:

```
src/api/driver/03-signup/
  signup.routes.ts       the path, the method, and whether a token is required
  signup.controller.ts   validates the body, calls one service, returns the result
  signup.dto.ts          the shape the body must have
```

A rule about *what may happen* is never in these files — it lives in a service,
so two endpoints can share it without copying it.

## The sign-in flow

```
POST /requestOTP   { countryCode, phoneCode, phoneNumber }
   ├─ 200  a code is sent — this driver already exists
   └─ 409  SIGN_UP_REQUIRED
             └─ POST /signup   the form, which sends the code
POST /verifyOTP    proves the code; creates the account on a first sign-up
GET  /session?countryCode=GB&phoneCode=%2B44&phoneNumber=…
                   first time only: tokens, driver, access, documents
GET  /session      every later launch, with the access token
POST /refresh      when the access token has expired
```

## Rides and earnings

Three screens read from one table. `rides` holds finished work only — nothing
writes a row until a ride is over — and `driver_shifts` holds the stretches a
driver was available, which is what "online" counts.

| Screen | Endpoint |
|---|---|
| Ride completed (the receipt) | `GET /rides/:rideId` |
| Earnings | `GET /earnings?period=today\|week\|month` |
| Ride history | `GET /rides?loadMoreBefore=…&status=…` |

**The names say what they are.** `driverEarnings`, `totalFare`,
`waitingTimeInMinutes`, `isPaymentSettled` — longer than the columns behind
them, on purpose: a field that has to be explained costs more in questions
than it saves in characters.

**Money is stored per ride, not recomputed.** A receipt is a historical
record: changing the service-fee rate next month must not rewrite what a
driver was paid last month. `driverEarnings` is `totalFare + tipAmount −
serviceFee` as it stood on the day, and `serviceFee` travels positive — the
minus sign is the app's.

**Days are local days.** Which day a ride belongs to, and where a week starts,
are worked out in `config.timezone` — a ride at 00:30 belongs to that date in
London and to a different one in UTC. `GET /rides` groups on the server for
that reason: the client would need the same zone and the same arithmetic to
make its own totals agree.

**History pages on a cursor, not an offset.** `loadMoreBefore` is the
`startTime` of the last row shown; pass it straight back as
`?loadMoreBefore=` — one word for one thing. Null means there is nothing
older, which is what hides "Load earlier rides".

`?status=completed|cancelled` is what the filter control in the header
narrows to. It filters the list only — `thisWeek` still counts the whole week,
because the header says "38 rides this week" whatever is being looked at
below it.

**Nothing in a ride is null.** Every field a ride carries is always there,
including on a cancellation:

- `destinationAddress` — the passenger asked for somewhere, whether or not the
  car arrived
- `endTime` — a cancellation ends too, at the moment the driver gave up waiting
- `distanceInKm`, `durationInMinutes` — **zero** on a cancellation, which is
  the truth of it rather than an absence
- `waitingTimeInMinutes` — every ride has a wait at the pickup; on a
  cancellation it is longer, and it is what earned the fee

What changes between the two is which of them the screen shows: a completed
ride reads "9.4 km · 30 min", a cancelled one "Fee · 4 min wait". The app
picks by `status`, not by checking for nulls.

`GET /earnings` returns a bar for every day in the period, zeroes included — a
gap would read as missing data rather than a day off. The period's own dates
are `dailyEarnings`'s first and last entries and the peak the chart marks is
its largest, so neither is repeated as a field of its own.
`percentageChangeFromLastPeriod` is the one field that can be null, and only
when the previous period earned nothing — the change is then not a number
anything can render.

Nothing in these responses repeats what the caller already sent or could work
out in a line: the period asked for is not echoed back, and the fields that
are there are the ones a screen draws.

**Not here yet:** payouts, and rating the rider. Nothing in these responses
says when money reaches a bank account, and the stars on the receipt screen
have no endpoint behind them.

## The account screens

`GET /profile` is an aggregate, not a new subject. Almost every value on that
screen already exists — the driver, their vehicle, their documents, their week
— and the endpoint gathers them so one screen is one call rather than four
arriving at four different moments. Only the value each row shows travels; the
labels beside them are the app's.

Two fields are computed rather than read:

- **`totalRides` is counted from the `rides` table.** `drivers.total_rides`
  exists and nothing maintains it — it reads 0 for a driver with hundreds of
  rides, so it is not used.
- **`renewsOn` and `documentsExpiringCount`** come from the expiry fields the
  document config marks as a month, against
  `application.documentExpiryWarningDays`. Adding an expiry to another
  document needs no code change.

**`gender`** is what the driver gave at sign-up, or what a reviewer recorded
from the identity document — the personal information row shows it either way.
Null until one of them supplies it. Whether anybody has *confirmed* it is a
separate question, and `GET /ridePreferences` is where that is answered; this
row only shows the value.

**`rating` is always null.** Nothing produces one — there is no rating system.
It is in the response so the screen has somewhere to put one, not because a
driver has no score.

**There is no settings endpoint, on purpose.** Every row on that screen is
either a device concern or something no server code reads:

- **Face ID** and **location permission** belong to the device. A copy here
  would be a claim about state the server cannot see or enforce.
- **Language** only matters once the server generates text — push, SMS or
  email. It renders none today.
- **Terms & privacy** and the **app version** are `GET /config`'s and the
  app's own.

That leaves the **notifications toggle**, which genuinely will need storing —
the server is what sends notifications, so a preference kept only on the phone
cannot stop them. There is no push system yet, so the app keeps its
preferences locally until there is one. Storing four values nothing reads
would have been state pretending to be a feature.

## Gender-specific riding

A driver can ask to be matched by passenger gender. Three things decide whether
that is happening, and **all three have to agree**:

| | Who sets it | Where it lives |
|---|---|---|
| The feature is switched on for everyone | whoever edits the configuration | `features.genderPreference` in `config/app-config.json` |
| There is a gender to match on | the driver, at sign-up — or an admin | `drivers.gender` |
| The driver has turned the mode on | the driver | `drivers.gender_specific_mode_enabled`, `drivers.passenger_gender_preference` |

`GET /ridePreferences` answers with all of it:

```json
{
  "isFeatureAvailable": true,
  "driverGender": "FEMALE",
  "canTurnOnGenderSpecificMode": true,
  "isGenderSpecificModeOn": true,
  "passengerGenderPreference": "FEMALE"
}
```

`PATCH /ridePreferences` takes either field, or both. Neither is required on
its own, but a body with neither is refused rather than treated as a no-op —
the driver pressed save, and nothing changing is a mistake, not an outcome.

```json
{ "isGenderSpecificModeOn": true, "passengerGenderPreference": "FEMALE" }
```

It answers with the same shape `GET` does, so a screen that has just saved
holds the new version without asking for it again.

`passengerGenderPreference` is one of `ANY`, `FEMALE` or `MALE`. `ANY` is the
default and means the mode changes nothing for that driver, which is why it is
a value rather than a null. `driverGender` is one of `MALE`, `FEMALE` or
`OTHER`, or null before anyone has checked.

`canTurnOnGenderSpecificMode` is the app's answer to "may this driver use
this", and the app should not work it out from the fields around it. It is the
server's to decide, so the rule behind it can gain a condition without every
app release having to learn the new one. A false here is exactly what a `PATCH`
turning the mode on would refuse.

### `isGenderSpecificModeOn` is not the stored toggle

It is the answer to the whole three-part question above, computed on every
read. The toggle the driver set is stored, but it is not what the response
reports, because a driver seeing "on" while nothing is acting on it would be
told something untrue.

### When the feature is switched off for everyone

The flag is a switch on the feature, not an edit to anybody's data:

- `isGenderSpecificModeOn` reads **false** for every driver, whatever they set.
- `PATCH /ridePreferences` answers **403 `GENDER_FEATURE_DISABLED`**. Storing
  a choice nothing will act on, and showing it back as set, is worse than
  saying no.
- **Nothing stored is cleared.** Each driver's toggle and choice stay exactly
  where they were, and come back by themselves when the feature returns. Nobody
  is asked to set it again.

### The driver's own answer counts

`POST /signup` takes an optional `gender` of `MALE`, `FEMALE` or `OTHER`, and
that is all the mode needs. Nobody has to approve it first: the driver can set
their preference and switch the mode on in the same session they sign up in.

The only thing that stops the toggle is having no gender recorded at all, which
answers `403 GENDER_NOT_SET`. Setting `passengerGenderPreference` is not gated
even then — a stored choice that nothing acts on is harmless, and it means the
driver does not have to come back and choose again.

An admin can set or correct one through `PATCH /admin/drivers/:driverId` —
for a driver who skipped the field, or whose answer was wrong:

```json
{ "gender": "FEMALE" }
```

The server also stamps `gender_verified_at` when an admin sends the field, and
approving an application stamps it for a driver who declared one. Nothing reads
that column any more — it is kept as a record of when a person last checked,
and is there if the rule is ever tightened again. `null` clears the gender
itself, which does withdraw the mode: there is then nothing to match on.

### Errors

| Status | Code | When |
|---|---|---|
| 401 | `NO_TOKEN` | no `Authorization` header |
| 401 | `TOKEN_EXPIRED` | the token is expired or not valid |
| 401 | `WRONG_TOKEN_TYPE` | an admin token was sent to a driver endpoint |
| 403 | `GENDER_FEATURE_DISABLED` | `features.genderPreference` is off |
| 403 | `GENDER_NOT_SET` | turning the mode on with no gender recorded at all |
| 404 | `DRIVER_NOT_FOUND` | the token names a driver that no longer exists |
| 422 | `VALIDATION_FAILED` | `passengerGenderPreference` is not one of the three; `accepts` carries the list |
| 422 | `NOTHING_TO_UPDATE` | the body held neither field |
| 500 | `INTERNAL_ERROR` | anything unhandled |

The admin call adds one: `422 VALIDATION_FAILED` with `fields.gender` set to
`UNKNOWN_CHOICE`, and `accepts` carrying `MALE`, `FEMALE`, `OTHER`.

### What is not built: matching

Two parts of this feature have nowhere to go yet, and have deliberately not
been faked.

**A passenger's own gender preference is not stored with a ride request,
because there are no ride requests.** `rides` holds finished work — one row per
completed or cancelled ride, written when it is over. There is no requester, no
pending ride and no booking endpoint, so there is nothing to attach a
passenger's preference to.

**A ride request cannot carry `matched_by_gender_preference` or the
passenger's gender, because there is no ride request to carry them.** The audit
field is the right idea — a driver's app should be able to see that a request
reached them *because* of the rule rather than in spite of it — and it belongs
on the payload that delivers a request to a driver, which does not exist.

**No gender-based matching happens, because nothing dispatches rides.** The
rule itself is settled and sits in one place —
`GenderPreferenceService.matchingPreference(driver)` returns the gender a
driver may be sent, or null for anyone, applying all three conditions. Whatever
comes to dispatch rides calls that rather than reading the columns and
repeating the rule. Until then the stored preference is recorded and reported,
and nothing acts on it.

## What a rejection carries

`GET /trackStatus` answers with `rejection`, which is null in every state but a
sent-back application:

```jsonc
"rejection": {
  "reviewer": "Priya Raman",          // whoever pressed the button
  "team": "Compliance team",          // config.application.reviewTeam
  "message": "Thanks for applying …", // the note above the list
  "documents": [
    // id is the document id from GET /session — the same string a
    // PATCH /documents body is keyed by.
    { "id": "driverDrivingLicence", "image": "back", "reason": "The lower edge is cut off …" },
    // image null sends the whole document back rather than one photograph.
    { "id": "driverProfilePhoto", "image": null, "reason": "Face is partly out of frame …" }
  ]
}
```

Only what a person typed travels. The headings, the status pill, the
"Re-upload" buttons and the "Three documents did not pass review" line are the
app's own copy, worded from `status` and `documents.length`. The label a card shows
— "Driving licence · back image" — is built in the app from `id` and
`image` against the config it already holds, so changing that wording is not a
deploy of this service.

An admin writes it with `PATCH /admin/applications/:driverId`. Both refusals
carry it, and the difference is what the driver can do next:

```jsonc
// Sends it back. Names the documents AND reopens them for re-upload.
{ "action": "request_changes",    "message": "…", "documents": [ … ] }

// Final. Names them so the driver knows why, but nothing reopens.
{ "action": "reject_application", "reason":  "…", "documents": [ … ] }

// Accepts it. No note, no documents; rejection becomes null.
{ "action": "approve_application" }
```

`id` and `reason` are required on every entry — an entry naming no document
says nothing, and one with no reason puts a card on the driver's screen that
tells them nothing. `image` is the only optional part: leave it out to mean the
whole document. On `reject_application` the whole `documents` array is optional,
because an application can be refused on grounds that belong to no one document.

`reviewer` is taken from the admin token, never the body. The document-level
`rejectedDocuments` — which decides which uploads reopen — is derived from
`documents`, and only on `request_changes`.

Both PATCH endpoints answer with the record as it now stands, so a screen that
just saved does not have to ask for it again.

## Editing the configuration

`config/app-config.json` is what the driver app reads on launch, and the admin
panel's Configuration screen edits it directly.

```
GET /admin/config    the whole stored document
PUT /admin/config    replaces it, and answers with what is now stored
```

**Whole, not partial.** A merge has no answer for a removed country or a
reordered document list, so the screen holds the document it loaded and sends
all of it back.

**Validated before it reaches disk.** The same schema that runs at boot checks
the edit first, so there is no state in which the server serves configuration
it could not have loaded. A refusal comes back as `422 VALIDATION_FAILED` with
`fields` keyed by path — `branding.appName`, `signIn.countries.0.dialCode` —
so the form marks the control rather than showing one sentence about a file.

**Written to a sibling and renamed**, because a half-written file is one the
next boot cannot parse. A rename inside a directory is atomic, so a reader sees
either all of the old document or all of the new one.

**Live within a second.** `JsonFileConfigSource` checks the file's timestamp at
most once a second, so a save reaches every phone's next `GET /config` without
a deploy or a restart.

Writing is a separate port from reading. Every service in the app reads
configuration and none of them should be able to rewrite it, so only the admin
endpoint is handed `ConfigWriter`.

## The realtime connection

A WebSocket on the same server and port as the REST API, so there is one
hostname and one certificate rather than a second service to deploy.

```
ws://localhost:4000/ws          development
wss://<host>/ws                 deployed
```

### Signing in

The same access token `GET /session` issues. There is no second credential and
no sign-in message after connecting.

```
Authorization: Bearer <accessToken>     preferred
ws://host/ws?token=<accessToken>        where headers cannot be set
```

The token is checked **during the upgrade**, before the connection exists. A
bad one is answered with `401` and the same error envelope the REST API uses —
`NO_TOKEN`, `TOKEN_EXPIRED`, `WRONG_TOKEN_TYPE` — and no socket is opened, so
there is never an unauthenticated connection attached to anything. An admin
token is refused here exactly as a driver's token is refused by `/admin`.

The driver is taken from the token and held for the life of the connection.
Nothing a client sends can name a different driver.

### Close codes

Application reasons live in the 4000s; everything below 3000 belongs to the
protocol.

| Code | Means | What the app does |
|---|---|---|
| `4401` | the token expired mid-connection | `POST /refresh`, then reconnect |
| `4408` | the connection stopped answering pings | reconnect immediately |

A connection is pinged every 30 seconds. One missed round closes it, because an
idle TCP connection can look open long after the phone has gone.

### Every frame has the same shape

```json
{ "event": "applicationReviewed", "sentAt": "2026-10-06T12:52:32.258Z", "data": { } }
```

`sentAt` is the server's clock. It is there so a frame delivered late after a
reconnect can be ordered, or ignored where staleness matters.

### What the driver app receives

| Event | When |
|---|---|
| `connected` | once, after the handshake. Carries `driverId`, `isOnline`, `tokenExpiresAt` |
| `connectionAlive` | answer to a `checkConnection` |
| `applicationReviewed` | a reviewer approved or sent back the application |
| `onlineStatusChanged` | the shift opened or closed, on every device |
| `error` | something sent could not be acted on. Same codes as the REST API |

`applicationReviewed` carries exactly what `GET /trackStatus` would answer with
— `status`, `reviewedAt`, and `rejection` with the reviewer's own words — so
the status screen updates without a second call.

### What the driver app sends

| Message | Does |
|---|---|
| `checkConnection` | keepalive |
| `goOnline` | opens a shift |
| `goOffline` | closes it |

```json
{ "event": "goOnline" }
```

**Losing the connection ends the shift.** A driver whose phone died is not
available for work, and leaving the shift open would credit them online time
they never worked. A second device keeps them online.

**Reconnecting does not start a second shift.** `goOnline` while already
online returns the shift that is already running — two open rows would
double-count every overlap in `onlineTimeInMinutes`.

### Nothing here is the only way to learn something

Every event above has a REST endpoint reporting the same state. A driver who
was disconnected when it happened sees it on their next launch, so a missed
frame is never a lost fact.

### Not built: the ride events

`rideRequested`, `rideAccepted`, `rideCancelled`, `arrivedAtPickup`,
`rideStarted` and `rideCompleted` have nothing to raise them — there is no
ride request, no dispatch and no passenger. The six screens behind them wait on
the ride lifecycle, not on this connection.

## What sits behind the endpoints

```
src/
  api/driver/     one folder per endpoint, in flow order     ← start here
  api/admin/      the admin panel's endpoints
  modules/        the services each endpoint calls, by subject
    app-config/        reads and validates config/app-config.json
    auth/              codes, sign-up, tokens
    session/           the whole-state response
    documents/         every upload, on every screen
    vehicle/           the car's typed details
    review/            the review list, submitting, tracking
    rides/             finished work, and what it earned
    realtime/          who is connected, and pushing to them
    profile/           the account screen, gathered from the four above
    gender-preference/ gender-specific riding
    admin-auth/        the panel's own sign-in, and who may have one
    admin/             the admin panel's queries
  domain/         what a driver, a document, a vehicle is
  infrastructure/ the MySQL connection and schema, and the WebSocket gateway
  common/         the response envelope, errors, auth middleware
  config/         environment variables, validated at boot
  container.ts    the only file that names both an interface and a class
```

Inside a module, `ports/` are interfaces and `providers/` their implementations,
so swapping MySQL for anything else is a change in `container.ts` alone.

## Reference

`postman/Kit-Taxi-Driver-API.openapi.json` lists every request and response,
with every status and every key. Import it into Swagger. It is regenerated with
the Postman collection by `npm run postman`, so the two never drift apart.
