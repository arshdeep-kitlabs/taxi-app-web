/**
 * Records the API against a running server and writes a Postman collection
 * where every request carries the real response as a saved example.
 *
 *   npm run dev        (one terminal)
 *   npm run postman    (another)
 *
 * As each endpoint is designed, add one entry to `flow` below. Nothing else
 * needs changing — folders, variables and examples all follow from it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:4000';
/**
 * What the Dev environment ships with, which is not the same question as
 * where this run recorded. Recording against another port — a second server,
 * a staging box — should not bake that port into everyone's environment.
 */
const DEV_BASE = 'http://localhost:4000';

/**
 * Which slice of the API to record.
 *
 * 'minimal' is the driver's journey end to end, plus the two admin calls those
 * screens depend on: signing an admin in, and deciding an application.
 * 'full' adds the rest of the admin surface — the staff list, the driver
 * directory, the application queue — which exists and works, but has no screen
 * reading it yet.
 *
 *   npm run postman                    the minimal set
 *   API_SCOPE=full npm run postman     everything
 */
const SCOPE = process.env.API_SCOPE ?? 'minimal';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'postman');
mkdirSync(OUT, { recursive: true });

/**
 * Values captured as the run proceeds, substituted into later calls.
 *
 * The happy-path sign-up needs a number and an email nobody has used, or a
 * second run trips the resend guard or the duplicate-email rule. The saved
 * example shows the canonical values instead, so a reader sees the real screen.
 */
const runId = Date.now().toString(36).slice(-5);
const vars = {
  // Each reserved number has one job, so a second run against the same server
  // still records the same statuses:
  //   ...000  signs up and verifies      ...002-004  validation failures
  //   ...001  stays unregistered         ...005-009  already registered
  freshPhone: '7000000000',
  freshEmail: `mateo.${runId}@drive.kit-taxi.co`,
  // One of the registered reserved numbers, rotated so two runs close together
  // do not both trip the same resend guard.
  returningPhone: `700000000${5 + (Date.now() % 3)}`,
  // Reserved, registered, and seeded with rides at boot — the fresh driver
  // the rest of the run creates has no history to show.
  ridesPhone: '7000000009',
  // The reviewer who sends the application back, so the rejection example
  // carries a real name rather than a placeholder. Seeded active at boot while
  // test accounts are on, so a run never depends on admin_users being empty —
  // clearing that table signs whoever is using the panel out of their account.
  adminEmail: 'reviewer@kit-taxi.co',
  adminPassword: 'a-long-enough-password',
  // A fresh address each run, so the sign-up below is always a real creation.
  newAdminEmail: `priya.${runId}@kit-taxi.co`,
  // A second account, so the pending-approval queue has a real row in it.
  colleagueEmail: `sam.${runId}@kit-taxi.co`,
};

/** What the saved example shows, in place of the run-unique values. */
const forDisplay = {
  '{{freshPhone}}': '7000000001',
  '{{freshEmail}}': 'mateo@drive.kit-taxi.co',
  '{{returningPhone}}': '7000000007',
};
const fill = (text) => String(text).replace(/\{\{(\w+)\}\}/g, (m, key) => vars[key] ?? m);

/**
 * What a variable starts as in the published collection.
 *
 * Only for the ones somebody types. Tokens and ids are left empty because the
 * test script fills them in as the requests run.
 */
const VARIABLE_DEFAULTS = {
  adminEmail: 'reviewer@kit-taxi.co',
  adminPassword: 'a-long-enough-password',
  newAdminEmail: 'new-admin@kit-taxi.co',
  colleagueEmail: 'colleague@kit-taxi.co',
};

const recorded = [];
const mismatches = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(step) {
  // Some calls only exist to move the application into the state the next
  // recorded call needs. They run, and leave no row behind.
  if (step.silent) {
    const result = await send(step);
    if (step.capture && result.parsed?.success === true) {
      for (const [key, expr] of Object.entries(step.capture)) {
        vars[key] = new Function('d', `return ${expr}`)(result.parsed.data);
      }
    }
    console.log(`   ${String(result.status).padEnd(3)} ${step.method.padEnd(6)} ${result.realPath}  (setup)`);
    return result.parsed;
  }

  const first = await send(step);

  // The resend guard is time-based, so two runs close together can trip it on a
  // call that is meant to succeed. Wait it out once rather than record a 429
  // where the example should show the happy path.
  const trippedGuard =
    first.status === 429 &&
    step.expect?.includes(200) &&
    typeof first.parsed?.error?.retryAfterSeconds === 'number';

  if (trippedGuard) {
    const seconds = first.parsed.error.retryAfterSeconds;
    console.log(`     waiting ${seconds}s for the resend guard`);
    await sleep((seconds + 1) * 1000);
    return record(step, await send(step));
  }

  return record(step, first);
}

async function send({ path, method, body, auth }) {
  const realPath = fill(path);
  const realBody = body ? JSON.parse(fill(JSON.stringify(body))) : undefined;

  const headers = {};
  if (realBody) headers['Content-Type'] = 'application/json';
  // auth: true signs in as the driver; auth: 'admin' as the member of staff
  // reviewing them. Two different token kinds, and neither opens the other's
  // endpoints, so the collection has to hold both.
  const token = auth === 'admin' ? vars.adminToken : auth ? vars.authToken : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${realPath}`, {
    method,
    headers,
    body: realBody ? JSON.stringify(realBody) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not json */
  }

  return { status: res.status, statusText: res.statusText, text, parsed, realPath };
}

function record(step, result) {
  const { folder, name, method, path, body, auth, desc, capture, expect, attachTo, optional, partial, primaryExample } =
    step;
  const { status, statusText, text, parsed, realPath } = result;

  const wrong = expect && !expect.includes(status);
  if (wrong) mismatches.push(`${method} ${realPath} → ${status}, expected ${expect.join('/')}`);
  console.log(` ${wrong ? '!' : ' '} ${String(status).padEnd(3)} ${method.padEnd(6)} ${realPath}`);
  if (wrong) console.log(`     expected ${expect.join('/')} — ${text.slice(0, 140)}`);

  if (capture && parsed?.success === true) {
    for (const [key, expr] of Object.entries(capture)) {
      try {
        const value = new Function('d', `return ${expr}`)(parsed.data);
        if (value !== undefined && value !== null) vars[key] = value;
      } catch {
        /* ignore */
      }
    }
  }

  const shownBody = body
    ? JSON.parse(
        Object.entries(forDisplay).reduce(
          (json, [token, value]) => json.replaceAll(token, value),
          JSON.stringify(body),
        ),
      )
    : undefined;

  recorded.push({
    folder, name, method, path: Object.entries(forDisplay).reduce((shown, [token, value]) => shown.replaceAll(token, value), path), body: shownBody, auth, desc, attachTo, optional, partial, primaryExample,
    code: status,
    statusText,
    response: parsed ? JSON.stringify(parsed, null, 2) : text.slice(0, 400),
  });
  return parsed;
}

// ---------------------------------------------------------------- the calls
// One entry per endpoint. Add to this list as each screen's API is designed.

const allSteps = [
  {
    folder: '01 · App launch',
    name: 'Get config',
    method: 'GET',
    path: '/config',
    expect: [200],
    desc:
      'Everything the app needs before its first screen paints, and the only call it can make ' +
      'without a token.\n\n' +
      'Serves the sign-in screen end to end:\n' +
      '• branding — wordmark, logo, the map behind the welcome copy, and the headline text, so ' +
      'wording changes need no app release\n' +
      '• theme — colours, corner radii and typefaces as tokens rather than values hard-coded in ' +
      'the app\n' +
      '• auth.methods — drives the Phone / Email toggle. One entry means the app shows no toggle\n' +
      '• auth.countries — the GB +44 picker, with preselected saying which one it opens on\n' +
      '• auth.social — Apple and Google. A disabled provider is omitted rather than returned as ' +
      'enabled:false, so the app renders what it is given and decides nothing\n' +
      '• legal — the two footer links, each with a version that is sent back on acceptance so ' +
      'consent is auditable\n\n' +
      'Cacheable for five minutes; it changes on deploy, not per request.',
  },
  {
    folder: '01 · App launch',
    name: 'Wrong path or method (404)',
    method: 'POST',
    path: '/config',
    expect: [404],
    attachTo: 'GET /config',
    desc:
      'Filed here so the set is visible, but it is not /config answering — no route matched at ' +
      'all, and every endpoint gives the same reply to a mistyped address.\n\n' +
      'Otherwise this endpoint has exactly one response. It takes no input, needs no token and ' +
      'reads no driver, so there is nothing for it to reject. Even a broken or deleted ' +
      'configuration file leaves it at 200: the edit is refused and the last good copy keeps ' +
      'serving, which is what stops a bad edit taking the app down.',
  },
  {
    folder: '02 · Request a code',
    name: 'A number nobody has signed up with (409)',
    method: 'POST',
    path: '/requestOTP',
    expect: [409],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{freshPhone}}' },
    desc:
      'The Login button, and where the two branches part. A country, a number, and nothing else.\n\n' +
      'SIGN_UP_REQUIRED is the app\'s signal to show the sign-up form and post it to /signup. It is ' +
      'the only thing this endpoint reveals about an account, and it reveals it only to someone who ' +
      'already typed the number.',
  },
  {
    folder: '03 · Sign up',
    name: 'Send the sign-up form',
    method: 'POST',
    path: '/signup',
    expect: [200],
    optional: ['lastName', 'gender', 'receivePromotions'],
    body: {
      countryCode: 'GB',
      phoneCode: '+44',
      phoneNumber: '{{freshPhone}}',
      firstName: 'Mateo',
      lastName: 'Okafor',
      email: '{{freshEmail}}',
      dateOfBirth: '1990-03-14',
      gender: 'FEMALE',
      receivePromotions: false,
    },
    desc:
      'Checks the details and sends a code, and returns nothing but success. Nothing is written ' +
      'to a driver yet: the details ride on the code, so a form nobody finishes leaves no account ' +
      'behind, and nobody can rewrite an account they have not proved they own.\n\n' +
      'gender is optional, one of MALE, FEMALE or OTHER, and is stored as the driver\'s word ' +
      'rather than a checked fact: it shows on their profile and cannot switch gender-specific ' +
      'riding on. Approving their application confirms it, because that is when somebody has ' +
      'read the identity document — see 14 · Ride preferences.',
  },
  {
    folder: '03 · Sign up',
    name: 'Missing the whole form (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000002' },
    desc: 'error.fields is keyed by input name, so the form highlights the right control.',
  },
  {
    folder: '03 · Sign up',
    name: 'Too young to drive (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7000000002',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada.young@drive.kit-taxi.co',
      dateOfBirth: '2015-01-01',
      receivePromotions: false,
    },
    desc: 'The limit lives in configuration and travels back as minimumAge, so the app words its own line.',
  },
  {
    folder: '03 · Sign up',
    name: 'Email that is not an address (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7000000002',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada-at-nowhere',
      dateOfBirth: '1992-01-01',
      receivePromotions: false,
    },
    desc: '',
  },
  {
    folder: '03 · Sign up',
    name: 'Country we do not operate in (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: {
      countryCode: 'US',
      phoneCode: '+1',
      phoneNumber: '7000000002',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada@drive.kit-taxi.co',
      dateOfBirth: '1992-01-01',
      receivePromotions: false,
    },
    desc: 'Only the countries listed in /config are accepted.',
  },
  {
    folder: '03 · Sign up',
    name: 'Prefix that belongs to another country (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: {
      countryCode: 'GB',
      phoneCode: '+91',
      phoneNumber: '7000000002',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada@drive.kit-taxi.co',
      dateOfBirth: '1992-01-01',
      receivePromotions: false,
    },
    desc:
      'The two halves are checked against each other, so the right country with the wrong prefix ' +
      'is refused rather than quietly dialling somewhere else. expectedPhoneCode carries the one ' +
      'we expect.',
  },
  {
    folder: '03 · Sign up',
    name: 'Number outside the test range (422)',
    method: 'POST',
    path: '/signup',
    expect: [422],
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7700900341',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada@drive.kit-taxi.co',
      dateOfBirth: '1992-01-01',
      receivePromotions: false,
    },
    desc:
      'While ALLOW_TEST_ACCOUNTS is on, the reserved range is the only range, so a development ' +
      'server can never message a real handset. The loader refuses to switch the flag on in production.',
  },
  {
    folder: '04 · Verify your number',
    name: 'Verify the code',
    method: 'POST',
    path: '/verifyOTP',
    expect: [200],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{freshPhone}}', code: '1111' },
    desc:
      'Proves the code. On a first sign-up this is also where the account is created, from the ' +
      'details /signup left behind.\n\n' +
      'It returns nothing: the tokens and the driver come from GET /session, which the app calls ' +
      'next with the same number. A proved code is burned immediately — sending it again answers ' +
      'CODE_EXPIRED. Reserved test numbers always accept 1111.',
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a challenge to get wrong',
    method: 'POST',
    path: '/signup',
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7000000003',
      firstName: 'Ada',
      email: 'ada.wrongcode.{{freshEmail}}',
      dateOfBirth: '1992-01-01',
    },
  },
  {
    folder: '04 · Verify your number',
    name: 'Wrong code (401)',
    method: 'POST',
    path: '/verifyOTP',
    expect: [401],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000003', code: '9999' },
    desc: 'attemptsRemaining counts down from five. At zero the code is locked and a new one must be requested.',
  },
  {
    folder: '04 · Verify your number',
    name: 'Code already used (410)',
    method: 'POST',
    path: '/verifyOTP',
    expect: [410],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{freshPhone}}', code: '1111' },
    desc: 'The same request as the first one, sent a second time. A proved code cannot be replayed.',
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a challenge to spend attempts against',
    method: 'POST',
    path: '/signup',
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7000000004',
      firstName: 'Ada',
      email: 'ada.attempts.{{freshEmail}}',
      dateOfBirth: '1992-01-01',
    },
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a wrong code',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '9999' },
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a wrong code',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '9999' },
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a wrong code',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '9999' },
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a wrong code',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '9999' },
  },
  {
    folder: '04 · Verify your number',
    silent: true,
    name: 'setup: a wrong code',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '9999' },
  },
  {
    folder: '04 · Verify your number',
    name: 'Locked out after too many wrong codes (423)',
    method: 'POST',
    path: '/verifyOTP',
    expect: [423],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '7000000004', code: '1111' },
    desc:
      'Five wrong codes and the challenge stops accepting any, right one included. Asking for a ' +
      'new code starts again.',
  },
  {
    folder: '02 · Request a code',
    name: 'Send a code to a driver we know',
    method: 'POST',
    path: '/requestOTP',
    expect: [200],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{returningPhone}}' },
    desc: 'The same button, for a number that already has an account. No sign-up form in sight.',
  },
  {
    folder: '02 · Request a code',
    name: 'Asking again too soon (429)',
    method: 'POST',
    path: '/requestOTP',
    expect: [429],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{returningPhone}}' },
    desc: 'retryAfterSeconds is what the resend button counts down.',
  },
  {
    folder: '03 · Sign up',
    name: 'A number that already has an account (409)',
    method: 'POST',
    path: '/signup',
    expect: [409],
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '{{returningPhone}}',
      firstName: 'Someone',
      lastName: 'Okafor',
      email: 'someone.else@drive.kit-taxi.co',
      dateOfBirth: '1990-03-14',
      receivePromotions: false,
    },
    desc:
      'Signing up over an existing account would let anyone who knows the number rewrite its ' +
      'details, so it is refused and the app is pointed at /requestOTP.',
  },
  {
    folder: '03 · Sign up',
    name: 'Email another driver already used (409)',
    method: 'POST',
    path: '/signup',
    expect: [409],
    body: {
      countryCode: 'GB', phoneCode: '+44',
      phoneNumber: '7000000002',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: '{{freshEmail}}',
      dateOfBirth: '1992-01-01',
      receivePromotions: false,
    },
    desc: 'Checked before a code is sent, so an address is never proved twice.',
  },
  {
    folder: '05 · Session',
    name: 'Get the session after verifying',
    method: 'GET',
    path: '/session?countryCode=GB&phoneCode=%2B44&phoneNumber={{freshPhone}}',
    expect: [200],
    capture: {
      authToken: 'd.accessToken',
      refreshToken: 'd.refreshToken',
      // The reviewer's call is addressed by driver id, so it is taken here.
      driverId: 'd.driver.id',
    },
    desc:
      'The first call after /verifyOTP. The driver holds no token yet, so the number they just ' +
      'verified says who they are. Encode the + as %2B.\n\n' +
      'Returns the tokens, who the driver is, what they may do, and every document grouped the way ' +
      'the screens are. The proof it spends is one-use and lasts two minutes.',
  },
  {
    folder: '05 · Session',
    name: 'Number already claimed, or never verified (401)',
    method: 'GET',
    path: '/session?countryCode=GB&phoneCode=%2B44&phoneNumber={{freshPhone}}',
    expect: [401],
    desc: 'The verified number opens one session only. After that the access token is the way in.',
  },
  {
    folder: '05 · Session',
    name: 'Get the session on later launches',
    method: 'GET',
    path: '/session',
    auth: true,
    expect: [200],
    desc:
      'Every launch after the first. The access token in the Authorization header says who the ' +
      'driver is, and the response is exactly the same shape.',
  },
  {
    folder: '06 · Refresh the session',
    name: 'Get a new pair of tokens',
    method: 'POST',
    path: '/refresh',
    auth: false,
    expect: [200],
    body: { refreshToken: '{{refreshToken}}' },
    capture: { authToken: 'd.accessToken', refreshToken: 'd.refreshToken' },
    desc:
      'The auth token is short-lived, so the app calls this quietly in the background rather than ' +
      'sending the driver back to the sign-in screen every hour. expiresIn on the session response ' +
      'says when to.\n\n' +
      'The proof travels in the body, not the Authorization header — by the time this is called ' +
      'the auth token has usually expired, so it cannot be renewed with itself. Sending an auth ' +
      'token here answers WRONG_TOKEN_TYPE.\n\n' +
      'Both tokens come back replaced, so a phone in regular use never reaches the refresh ' +
      'token\'s own expiry and never asks the driver to sign in again for no reason.',
  },
  {
    folder: '06 · Refresh the session',
    name: 'Reject an auth token sent here (401)',
    method: 'POST',
    path: '/refresh',
    expect: [401],
    body: { refreshToken: '{{authToken}}' },
    desc: 'Only a refresh token renews a session.',
  },
  {
    folder: '09 · Submit the application',
    name: 'Submitted before it is finished (409)',
    method: 'POST',
    path: '/submit',
    auth: true,
    expect: [409],
    body: { declarationAccepted: true },
    desc:
      'missingImages and missingValues say how much is outstanding, so the app can word its own ' +
      'prompt. canSubmit on the review response is the same rule, read ahead of pressing the button.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Image before the ID type is chosen (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { driverGovernmentId: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } } },
    desc: 'The slots follow the choice, so there is nothing to fill until one is made.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Upload all identity documents',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [200],
    partial: true,
    body: {
      driverGovernmentId: {
        type: 'passport',
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
      driverDrivingLicence: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
        fields: { licenceNumber: 'OKAFO903142M', expiry: '2031-08' },
      },
      driverProfilePhoto: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          left: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          right: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
    },
    desc:
      'Every identity document in one call. The body is keyed by document name, so send as many ' +
      'or as few as you have — one tile on its own works the same way, and sending one never ' +
      'clears another.\n\n' +
      'type is the dropdown choice, checked against the choices in the session response — the ' +
      'tiles a card asks for follow it, so a passport wants two and a birth certificate one. ' +
      'images is keyed by slot name. fields carries the typed boxes that sit beside the photos.\n\n' +
      'expiry is YYYY-MM; the screen shows it as 08 / 2031. An expiry in the past is refused here ' +
      'rather than being found days later during review.\n\n' +
      'With every slot filled and both boxes in, canContinue turns true.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Angle that does not exist (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { driverGovernmentId: { images: { side: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } } },
    desc: 'Slot names are checked against the card, and the message names the ones it accepts.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Expired document (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { driverDrivingLicence: { fields: { expiry: '2020-01' } } },
    desc: 'A document that has already expired is no use to a reviewer.',
  },
  {
    folder: '07 · Upload documents',
    name: 'No token (401)',
    method: 'PATCH',
    path: '/documents',
    expect: [401],
    body: { driverProfilePhoto: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } } },
    desc: 'Every call on this screen needs the auth token from /verifyOTP. The driver id is read from the token, never from the body.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Save the vehicle — details and documents',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    partial: true,
    body: {
      details: {
        make: 'volvo',
        model: 'S90',
        year: 2024,
        colour: 'graphite',
        licencePlate: 'lr 24 nmd',
      },
      driverVehicleDoc: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
      driverInsuranceCertificate: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
      driverMotCertificates: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
      driverPrivateHireLicence: {
        images: {
          front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
          back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg',
        },
      },
    },
    desc:
      'The whole vehicle screen in one call. Documents are keyed by name, so send as many or as ' +
      'few as you have — one card on its own works the same way, and sending one never clears ' +
      'another. The private hire licence is optional: leave it out and canContinue still turns ' +
      'true once the other three are in.\n\n' +
      'details is the reserved key for the car\'s typed values. A select carries the option id, ' +
      'not its label; the year is checked against the range in config; the plate is matched ' +
      'against the pattern for the region and stored normalised — "lr 24 nmd" is kept as ' +
      '"LR 24 NMD". They are stored, not echoed back: the app holds that form, and the review ' +
      'screen is where they are read again.',
  },
  {
    folder: '04 · Verify your number',
    name: 'Code in the wrong shape (422)',
    method: 'POST',
    path: '/verifyOTP',
    expect: [422],
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{returningPhone}}', code: 'abcd' },
    desc: 'Digits only. The length the screen should draw is in /config as otp.codeLength.',
  },
  {
    folder: '05 · Session',
    name: 'No auth token (401)',
    method: 'GET',
    path: '/session',
    expect: [401],
    desc: 'GET needs the token the POST handed out.',
  },
  {
    folder: '06 · Refresh the session',
    name: 'A token that is not ours (401)',
    method: 'POST',
    path: '/refresh',
    expect: [401],
    body: { refreshToken: 'not.a.real.token' },
    desc: 'The driver signs in again from here.',
  },
  {
    folder: '06 · Refresh the session',
    name: 'Nothing sent (422)',
    method: 'POST',
    path: '/refresh',
    expect: [422],
    body: {},
    desc: '',
  },
  {
    folder: '07 · Upload documents',
    name: 'Document that does not exist (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { taxPapers: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } } },
    desc: 'Only the documents configuration defines can be written.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Something that is not a link (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { driverProfilePhoto: { images: { front: 'not-a-url' } } },
    desc: 'An image is a link to a file stored elsewhere.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Detail this screen does not collect (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { details: { seats: 4 } },
    desc: 'Only the fields configuration defines are accepted, so a stale app cannot write a value nobody reads.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Plate in the wrong shape (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { details: { licencePlate: '!!' } },
    desc: 'Matched against the pattern for the region before it is stored.',
  },
  {
    folder: '09 · Submit the application',
    name: 'Declaration not ticked (422)',
    method: 'POST',
    path: '/submit',
    auth: true,
    expect: [422],
    body: { declarationAccepted: false },
    desc: 'The tick is what records the driver accepting the terms, so it is not optional.',
  },
  {
    folder: '10 · Verification in progress',
    name: 'No auth token (401)',
    method: 'GET',
    path: '/trackStatus',
    expect: [401],
    desc: '',
  },
  {
    folder: '07 · Upload documents',
    name: 'Upload every document in one call',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [200],
    partial: true,
    // The body a tool generating requests from the OpenAPI file starts with:
    // one operation gets one body there, so it has to be the complete one.
    primaryExample: true,
    body: {
      details: { make: 'volvo', model: 'S90', year: 2024, colour: 'graphite', licencePlate: 'LR 24 NMD' },
      driverGovernmentId: { type: 'passport', images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
      driverDrivingLicence: {
        images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' },
        fields: { licenceNumber: 'OKAFO903142M', expiry: '2031-08' },
      },
      driverProfilePhoto: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', left: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', right: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
      driverVehicleDoc: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
      driverInsuranceCertificate: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
      driverMotCertificates: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
      driverPrivateHireLicence: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg', back: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } },
    },
    desc:
      'Every document, every photo and the vehicle details in a single call — enough on its own ' +
      'to take a new driver from nothing to submittable.\n\n' +
      'The two calls above split the same thing the way the app collects it, one screen at a ' +
      'time. Either route ends with missingImages 0, missingValues 0 and canSubmit 1.\n\n' +
      'driverGovernmentId is the only document with a dropdown, so it is the only one needing ' +
      'type. passport asks for front and back; rationCard and birthCertificate ask for front ' +
      'alone, and sending back for those is refused as UNKNOWN_IMAGE_SLOT.\n\n' +
      'driverPrivateHireLicence is optional — leave it out and the application still submits. ' +
      'It is why imagesUploaded reads 15 of 13: thirteen are required, and the optional licence ' +
      'adds two on top.',
  },
  {
    folder: '08 · Review your application',
    name: 'Get the whole application to review',
    method: 'GET',
    path: '/review',
    auth: true,
    expect: [200],
    desc:
      'Everything the driver is about to submit, flat: the personal details, then a row per value ' +
      'and a row per image with whether it is in and where to look at it.\n\n' +
      'This screen only displays and corrects, so the placeholders, choices and helper text the ' +
      'upload screens need are left out. url is what the eye button opens, and is null until the ' +
      'image is uploaded.\n\n' +
      'missingImages and missingValues are what the Submit button waits on; canSubmit turns 1 when ' +
      'both reach zero. An optional document is listed but never counted. Ticking the declaration ' +
      'is the app\'s own gate on top of canSubmit.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Reject a make that is not on the list (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { details: { make: 'ferrari' } },
    desc: 'A chosen option is checked against config, and accepts carries the ids the server takes.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Reject a vehicle that is too old (422)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [422],
    body: { details: { year: 2004 } },
    desc: 'The year has to sit inside the range in config, which travels back as min and max.',
  },
  {
    folder: '09 · Submit the application',
    name: 'Submit the application',
    method: 'POST',
    path: '/submit',
    auth: true,
    expect: [200],
    body: { declarationAccepted: true },
    desc:
      'The Submit button. declarationAccepted is the tick under the list; the wording belongs to ' +
      'the app, and the acceptance is dated against the driver here.\n\n' +
      'From this point every document is frozen — /documents, /vehicle and /review all answer ' +
      'APPLICATION_LOCKED — so nothing changes under a reviewer who is already reading it. ' +
      'canSubmit turns 0 and status turns submitted.',
  },
  {
    folder: '09 · Submit the application',
    name: 'Reject a second submission (409)',
    method: 'POST',
    path: '/submit',
    auth: true,
    expect: [409],
    body: { declarationAccepted: true },
    desc: 'An application goes in once.',
  },
  {
    folder: '07 · Upload documents',
    name: 'Edit after submission (409)',
    method: 'PATCH',
    path: '/documents',
    auth: true,
    expect: [409],
    body: { driverProfilePhoto: { images: { front: 'https://i.pinimg.com/736x/24/69/83/246983a725c33409cd88436fb3b609ea.jpg' } } },
    desc:
      'Submitting freezes every document, so nothing changes under a reviewer who is already ' +
      'reading it. A rejection reopens them.',
  },
  {
    folder: '10 · Verification in progress',
    name: 'Track the application',
    method: 'GET',
    path: '/trackStatus',
    auth: true,
    expect: [200],
    desc:
      'What the waiting screen shows. reference is what the driver quotes to support; it is issued ' +
      'on the first submission and kept for the life of the case, so a resubmission after a ' +
      'rejection is still the same one.\n\n' +
      'status is draft, submitted, rejected or approved. reviewedAt is when a reviewer last acted — ' +
      'the app words its own "started 2 hours ago" from it, and the copy on the screen belongs to ' +
      'the app throughout.\n\n' +
      'rejection is null here, because nothing has been decided yet. On an approval the home ' +
      'screen unlocks; on a rejection it fills in and the upload routes open back up — the next ' +
      'folder records that.',
  },
  // --- the reviewer's half, so the rejection below is a real response ------
  {
    folder: '13 · Profile',
    name: 'The account screen',
    method: 'GET',
    path: '/profile',
    auth: true,
    expect: [200],
    desc:
      'One call for a screen whose values live in four places — the driver, their vehicle, their ' +
      'documents and their week. Only the value each row shows travels; the labels beside them ' +
      'belong to the app.\n\n' +
      'totalRides is counted from the rides themselves. There is a drivers.total_rides column and ' +
      'nothing maintains it, so it is not used.\n\n' +
      'renewsOn and documentsExpiringCount come from the expiry fields the document config marks ' +
      'as a month, measured against application.documentExpiryWarningDays.\n\n' +
      'rating is always null: nothing produces one yet. It is in the response so the screen has ' +
      'somewhere to put a score, not because this driver has none.\n\n' +
      "gender is the one a reviewer recorded from the identity document, for the personal " +
      'information row. It is null until someone has. GET /ridePreferences carries it too, with ' +
      'the rest of what the gender-specific riding screen needs.',
  },
  {
    folder: '15 · Admin',
    name: 'Create an admin account',
    method: 'POST',
    path: '/admin/signup',
    expect: [201],
    body: { name: 'Priya Raman', email: '{{newAdminEmail}}', password: '{{adminPassword}}' },
    desc:
      'Public, because it is how the first person ever gets in. On an empty admin_users the ' +
      'account is activated immediately as Super Admin — there is nobody to approve it. Every ' +
      'account after that is created pending and cannot sign in until an existing admin ' +
      'approves it, which is what activated tells you.\n\n' +
      'This example shows the second case: a reviewer already exists on the development server, ' +
      'so the new account comes back pending and activated is false. Approve it from ' +
      'PATCH /admin/users/:adminId, or sign in as the reviewer below.\n\n' +
      'Passwords are at least 10 characters, and stored scrypt-hashed.',
  },
  {
    folder: '15 · Admin',
    name: 'Sign in as an admin',
    method: 'POST',
    path: '/admin/login',
    expect: [200],
    body: { email: '{{adminEmail}}', password: '{{adminPassword}}' },
    capture: { adminToken: 'd.token' },
    desc:
      'Returns the token the /admin calls send. The collection script puts it in the ' +
      'adminToken variable for you. expiresIn is eight hours.\n\n' +
      'A wrong address and a wrong password fail identically, as INVALID_CREDENTIALS, so neither ' +
      'answer says whether an account exists. An account that is not active is the one case that ' +
      'says more — ADMIN_PENDING_APPROVAL, ADMIN_SUSPENDED or ADMIN_REJECTED — because the ' +
      'person needs telling why.',
  },
  {
    folder: '15 · Admin',
    name: 'Who am I',
    scope: 'full',
    method: 'GET',
    path: '/admin/me',
    auth: 'admin',
    expect: [200],
    desc:
      'The account behind the token. The panel calls it on every load to rehydrate a session it ' +
      'stored, which is also what makes a suspension take effect before the token expires: the ' +
      'status is checked here, not only at sign-in.',
  },
  {
    folder: '15 · Admin',
    name: 'Invite a colleague (pending)',
    scope: 'full',
    method: 'POST',
    path: '/admin/signup',
    expect: [201],
    body: { name: 'Sam Patel', email: '{{colleagueEmail}}', password: '{{adminPassword}}' },
    capture: { adminUserId: 'd.admin.id' },
    desc:
      'The same call as the first account, answering differently because the table is no longer ' +
      'empty: status is pending and activated is false, so this person cannot sign in until ' +
      'somebody approves them.',
  },
  {
    folder: '15 · Admin',
    name: 'List admin accounts',
    scope: 'full',
    method: 'GET',
    path: '/admin/users',
    auth: 'admin',
    expect: [200],
    desc:
      'Every member of staff, pending ones first — the queue is the reason anyone opens this ' +
      'list. There are no roles yet, so an active account can do everything this API offers.',
  },
  {
    folder: '15 · Admin',
    name: 'Approve a colleague',
    scope: 'full',
    method: 'PATCH',
    path: '/admin/users/{{adminUserId}}',
    auth: 'admin',
    expect: [200],
    body: { status: 'active' },
    desc:
      'Approving, suspending or rejecting an account. status is the whole body — there are no ' +
      'roles yet, so there is nothing else to decide.\n\n' +
      'Two things are refused, because both end with nobody able to get in: changing your own ' +
      'status (CANNOT_CHANGE_OWN_STATUS) and standing down the last active admin ' +
      '(LAST_ACTIVE_ADMIN).',
  },
  {
    folder: '16 · Get driver details',
    name: 'List drivers',
    scope: 'full',
    method: 'GET',
    path: '/admin/drivers',
    auth: 'admin',
    expect: [200],
    desc:
      'What the directory screen lists. Add ?search= to match a name, email or phone, and ' +
      '?status=active|suspended|blocked to narrow it to an account state.',
  },
  {
    folder: '16 · Get driver details',
    name: 'Get driver details',
    method: 'GET',
    path: '/admin/drivers/{{driverId}}',
    auth: 'admin',
    expect: [200],
    desc: 'The whole profile behind a row: the account, the vehicle and the documents.',
  },
  {
    folder: '16 · Get driver details',
    name: 'Update a driver',
    scope: 'full',
    method: 'PATCH',
    path: '/admin/drivers/{{driverId}}',
    auth: 'admin',
    expect: [200],
    body: { city: 'Leicester' },
    desc:
      'Every key is optional, and only what is sent is touched. status is the account state — ' +
      'active, suspended or blocked — which is a separate question from where the application ' +
      'stands: an approved driver can still be suspended.\n\n' +
      'vehicle merges into the car\'s typed details; a null there clears that field rather than ' +
      'storing null.',
  },
  {
    folder: '17 · Send status',
    name: 'List applications',
    scope: 'full',
    method: 'GET',
    path: '/admin/applications',
    auth: 'admin',
    expect: [200],
    desc:
      'The review queue. ?status= narrows it to submitted, in_review, changes_requested, ' +
      'approved or rejected, and ?search= matches the driver or the reference.',
  },
  {
    folder: '17 · Send status',
    name: 'Get application details',
    scope: 'full',
    method: 'GET',
    path: '/admin/applications/{{driverId}}',
    auth: 'admin',
    expect: [200],
    desc:
      'Everything a reviewer reads before deciding: the applicant, every document with its ' +
      'images, and the vehicle. The ids here are the ones a rejection names.',
  },
  {
    folder: '17 · Send status',
    name: 'Send status — rejected',
    method: 'PATCH',
    path: '/admin/applications/{{driverId}}',
    auth: 'admin',
    expect: [200],
    body: {
      action: 'request_changes',
      message:
        'Thanks for applying to drive with Kit-taxi. Your personal details and vehicle record ' +
        'are approved. Before we can activate your account we need clearer copies of the ' +
        'documents listed below. Photograph each one in good light with no glare, and make sure ' +
        'the full document is inside the frame.',
      documents: [
        {
          id: 'driverDrivingLicence',
          image: 'back',
          reason:
            'The lower edge is cut off, so the licence categories cannot be read. Retake it on ' +
            'a flat surface with all four corners visible.',
        },
        {
          id: 'driverProfilePhoto',
          reason: 'Face is partly out of frame. Keep your head centred with no hat or sunglasses.',
        },
      ],
    },
    desc:
      'What an admin sends when an application is nearly right. It reopens the uploads and ' +
      'writes the note the driver reads on their status screen.\n\n' +
      'documents is keyed the same way a PATCH /documents body is: id is the document id from ' +
      'GET /session. image narrows it to one photograph — front, back, left or right — and may ' +
      'be left out to send the whole document back. reason is required on every entry, because ' +
      'without it the driver gets a card telling them nothing.\n\n' +
      'The admin\'s name is taken from the token, never the body.\n\n' +
      'THE OTHER DECISIONS ON THIS ENDPOINT\n' +
      'Accept it:            { "action": "approve_application" }\n' +
      'Refuse it outright:   { "action": "reject_application", "reason": "…" }\n\n' +
      'approve_application needs nothing else — an approval has no note and no documents to ' +
      'name. Both it and reject_application are terminal: the transition table allows nothing ' +
      'after either, so a second decision is refused as INVALID_TRANSITION. request_changes is ' +
      'the only one that reopens the uploads and puts a note on the driver\'s status screen.',
  },
  {
    folder: '10 · Verification in progress',
    name: 'Track a rejected application',
    method: 'GET',
    path: '/trackStatus',
    auth: true,
    expect: [200],
    desc:
      'The same call, now that an admin has answered. This is everything the "Action needed" ' +
      'screen cannot write for itself.\n\n' +
      'rejection.reviewer and .team are who decided; the app draws the initials for the avatar ' +
      'from the name. .message is the note above the list. .documents is one entry per thing to ' +
      'redo: id is the document id from GET /session, image is the photograph — front, back, ' +
      'left or right — or null when the whole document goes back, and reason is why.\n\n' +
      'No labels travel. "Driving licence · back image" is built in the app from id and image ' +
      'against the config it already holds, so that wording changes without deploying this ' +
      'service. The headings, the status pill, the Re-upload buttons and the "two documents did ' +
      'not pass review" line are the app\'s own copy, worded from status and documents.length.\n\n' +
      'status is changes_requested, and every document named is writable again.',
  },
  {
    silent: true,
    name: 'Driver fixes what was asked and resubmits',
    method: 'POST',
    path: '/submit',
    auth: true,
    body: { declarationAccepted: true },
  },
  {
    folder: '17 · Send status',
    name: 'Send status — accepted',
    method: 'PATCH',
    path: '/admin/applications/{{driverId}}',
    auth: 'admin',
    expect: [200],
    body: { action: 'approve_application' },
    desc:
      'Accepting an application. Nothing else is needed in the body — an approval has no note ' +
      'and no documents to name.\n\n' +
      'status turns approved, which is terminal: the transition table allows nothing after it, ' +
      'so a second decision is refused as INVALID_TRANSITION. Documents stay frozen, and ' +
      'trackStatus answers with rejection null.',
  },
  {
    folder: '10 · Verification in progress',
    name: 'Track an approved application',
    method: 'GET',
    path: '/trackStatus',
    auth: true,
    expect: [200],
    desc:
      'The third and last thing this screen shows. status is approved and rejection is null — ' +
      'the note from the earlier send-back is gone, cleared when the driver resubmitted, so the ' +
      'app never shows an old complaint over an application that has moved on.',
  },
  // --- a driver with history, for the two screens below --------------------
  {
    silent: true,
    name: 'Ask for a code as a driver who has been working',
    method: 'POST',
    path: '/requestOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{ridesPhone}}' },
  },
  {
    silent: true,
    name: 'Prove it',
    method: 'POST',
    path: '/verifyOTP',
    body: { countryCode: 'GB', phoneCode: '+44', phoneNumber: '{{ridesPhone}}', code: '1111' },
  },
  {
    silent: true,
    name: 'Take their session',
    method: 'GET',
    path: '/session?countryCode=GB&phoneCode=%2B44&phoneNumber={{ridesPhone}}',
    capture: { authToken: 'd.accessToken', driverId: 'd.driver.id' },
  },
  {
    folder: '11 · Rides',
    name: 'Ride history',
    method: 'GET',
    path: '/rides',
    auth: true,
    expect: [200],
    capture: { rideId: 'd.days[0].rides[0].rideId' },
    desc:
      'The history screen. Rides come back newest first, already grouped into local days with a ' +
      'count and a total per day — which day a ride belongs to is a timezone question, and the ' +
      'client would need the same zone and arithmetic to make its own totals agree.\n\n' +
      'Paging is on a cursor, not an offset: send loadMoreBefore straight back as ' +
      '?loadMoreBefore= and nothing is skipped or repeated if a ride is written mid-scroll. ' +
      'Null means there is nothing older, which is what hides "Load earlier rides".\n\n' +
      'thisWeek counts the week however far the list has been scrolled and whichever status is ' +
      'being looked at, because that is what the header shows.\n\n' +
      '?status=completed|cancelled is what the filter control narrows the list to. A cancelled ' +
      'Nothing in a ride is null. A cancellation still carries its destinationAddress and ' +
      'endTime, and its distanceInKm and durationInMinutes are zero rather than absent — ' +
      'nothing was driven. The app picks what to show by status, not by checking for nulls.',
  },
  {
    folder: '11 · Rides',
    name: 'Ride history, cancelled only',
    method: 'GET',
    path: '/rides?status=cancelled',
    auth: true,
    expect: [200],
    desc:
      'What the filter control in the header narrows to. status takes completed or cancelled; ' +
      'leaving it off returns both.\n\n' +
      'It filters the list only. summary still counts the whole week, because the header says ' +
      '"38 rides this week" whatever is being looked at below it.',
  },
  {
    folder: '11 · Rides',
    name: 'One ride receipt',
    method: 'GET',
    path: '/rides/{{rideId}}',
    auth: true,
    expect: [200],
    desc:
      'The screen shown the moment a ride ends. totalFare, tipAmount and serviceFee are the ' +
      'breakdown; driverEarnings is what the driver keeps. serviceFee travels positive — the ' +
      'minus sign belongs to the app.\n\n' +
      'The money is stored per ride rather than recomputed, so changing the fee rate next month ' +
      'cannot rewrite what a driver was paid last month.\n\n' +
      'A cancellation carries waitMinutes and no distance — the wait is what earned the fee.',
  },
  {
    folder: '12 · Earnings',
    name: 'Earnings this week',
    method: 'GET',
    path: '/earnings?period=week',
    auth: true,
    expect: [200],
    desc:
      'The earnings screen. period is today, week or month, matching its three tabs, and ' +
      'defaults to week.\n\n' +
      'dailyEarnings holds one bar per day in the period, zeroes included — a gap would read ' +
      'as missing data rather than a day off. The peak the chart marks is simply the largest ' +
      'of them.\n\n' +
      'percentageChangeFromLastPeriod compares with the period before this one, and is null ' +
      'when that period earned nothing, because the change is then not a number anything can ' +
      'render.\n\n' +
      'onlineTimeInMinutes is time available for work, not time on a trip: the gap between two ' +
      'jobs counts. It comes from driver_shifts, clipped to the period, so a shift spanning ' +
      'midnight counts towards both days.\n\n' +
      'Weeks run Monday to Sunday and months are calendar months, both worked out in the ' +
      'configured timezone rather than UTC.',
  },

  // --- gender-specific riding ----------------------------------------------
  // The refusals are recorded before the gender is verified, because that is
  // the only state they happen in. They are filed as examples on the call
  // below, not as requests of their own.
  {
    // A previous run of this file verified this driver's gender, and the two
    // refusals below only happen while it is unverified. Put back first, so a
    // second run records what the first one did.
    silent: true,
    folder: '14 · Ride preferences',
    name: 'Clear anything a previous run verified',
    method: 'PATCH',
    path: '/admin/drivers/{{driverId}}',
    auth: 'admin',
    expect: [200],
    body: { gender: null },
  },
  {
    folder: '14 · Ride preferences',
    name: 'Turning it on without a verified gender (403)',
    method: 'PATCH',
    path: '/ridePreferences',
    auth: true,
    expect: [403],
    body: { isGenderSpecificModeOn: true },
    desc:
      'The mode needs a gender to match on, and this driver has none. Nobody has to approve ' +
      'it \u2014 the driver\'s own answer counts \u2014 but there has to be one.\n\n' +
      'Two ways past it: the driver sends gender to POST /signup, or an admin sets one with ' +
      '16 \u00b7 Get driver details \u2192 Record a driver\'s gender.\n\n' +
      'Setting passengerGenderPreference on its own is not gated even here. A stored choice ' +
      'that nothing is acting on is harmless, and it means the driver does not have to come ' +
      'back and choose again.',
  },
  {
    folder: '14 · Ride preferences',
    name: 'A preference that is not one of the three (422)',
    method: 'PATCH',
    path: '/ridePreferences',
    auth: true,
    expect: [422],
    body: { passengerGenderPreference: 'WOMEN_ONLY' },
    desc: 'accepts carries the three values, so the app never has to hold the list itself.',
  },
  {
    folder: '16 · Get driver details',
    name: "Record a driver's gender",
    method: 'PATCH',
    path: '/admin/drivers/{{driverId}}',
    auth: 'admin',
    expect: [200],
    body: { gender: 'FEMALE' },
    desc:
      'How an admin records a gender for a driver who skipped the field at sign-up, or whose ' +
      'answer was wrong. It is not a gate: a driver who gave one at sign-up needs nothing from ' +
      'an admin.\n\n' +
      'The server stamps genderVerifiedAt as a record of when a person last checked. Nothing ' +
      'reads it. null clears the gender itself, which does switch the mode off \u2014 there is ' +
      'then nothing to match on, though the driver\'s stored preference stays.\n\n' +
      'One of MALE, FEMALE or OTHER. The same call also takes status, email and city; this is ' +
      'the whole body it needs for the gender.\n\n' +
      'driverId is whichever driver last took a session, which the collection script keeps in ' +
      'step with authToken — so this sets it on the driver you are signed in as.',
  },
  {
    // Also not recorded. It puts the driver in the state the screen below
    // shows, so the read and the write that follows it agree — and so they
    // agree on a second run too, which starts from whatever the first left.
    silent: true,
    folder: '14 · Ride preferences',
    name: 'Settle the driver in the mode',
    method: 'PATCH',
    path: '/ridePreferences',
    auth: true,
    expect: [200],
    body: { isGenderSpecificModeOn: true, passengerGenderPreference: 'FEMALE' },
  },
  {
    folder: '14 · Ride preferences',
    name: 'The gender-specific riding screen',
    method: 'GET',
    path: '/ridePreferences',
    auth: true,
    expect: [200],
    desc:
      'Three things decide whether this driver is matched by passenger gender, and all three ' +
      'have to agree: the feature is switched on for everyone, the driver has a gender ' +
      'recorded, and they have turned the mode on themselves.\n\n' +
      'isGenderSpecificModeOn is the answer to that whole question, not the stored toggle. ' +
      'Switching features.genderPreference off reads false here for every driver, while each ' +
      "driver's own choice stays stored and comes back by itself when the feature returns — " +
      'nobody is asked to set it again.\n\n' +
      'driverGender is what the driver gave at sign-up, or what an admin set. Null is the one ' +
      'thing that stops the toggle, and is what the screen explains.\n\n' +
      'canTurnOnGenderSpecificMode is whether this driver may use the feature at all. The app ' +
      'could work it out from the fields above and should not have to — eligibility is the ' +
      "server's answer to give, so the rule behind it can gain a condition without an app " +
      'release. A false here is what a PATCH turning the mode on would refuse.\n\n' +
      'The labels and the paragraph explaining the feature belong to the app, as everywhere ' +
      'else. Only this driver\'s state travels.',
  },
  {
    folder: '14 · Ride preferences',
    name: 'Turn gender-specific riding on',
    method: 'PATCH',
    path: '/ridePreferences',
    auth: true,
    expect: [200],
    body: { isGenderSpecificModeOn: true, passengerGenderPreference: 'FEMALE' },
    desc:
      'Both fields are optional and either may be sent alone — the toggle and the choice beside ' +
      'it are two controls on one screen. A body with neither is refused rather than treated as ' +
      'a no-op, because the driver pressed save.\n\n' +
      'The response is the whole screen again, so nothing has to be re-read after a save.\n\n' +
      'A fourth refusal this run cannot show: with features.genderPreference off in the ' +
      'configuration, every PATCH here answers 403 GENDER_FEATURE_DISABLED, because nothing ' +
      'would act on what was stored.',
  },
  {
    folder: '14 · Ride preferences',
    name: 'Without a token (401)',
    method: 'GET',
    path: '/ridePreferences',
    expect: [401],
    desc: 'Both calls here read the driver from the token, never from the body.',
  },
];

/** Steps marked for the fuller admin surface drop out unless it is asked for. */
const flow = allSteps.filter((step) => SCOPE === 'full' || step.scope !== 'full');

console.log(`Recording ${flow.length} calls against ${BASE}\n`);
for (const step of flow) await call(step);

// ------------------------------------------------------------ build the file

const segments = (path) => path.split('?')[0].replace(/^\//, '').split('/').filter(Boolean);

function buildRequest(entry) {
  const [pathPart, queryPart] = entry.path.split('?');
  const query = queryPart
    ? queryPart.split('&').map((pair) => {
        const [key, value] = pair.split('=');
        return { key, value };
      })
    : undefined;

  const request = {
    method: entry.method,
    header: [
      ...(entry.body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ...(entry.auth
        ? [
            {
              key: 'Authorization',
              value: entry.auth === 'admin' ? 'Bearer {{adminToken}}' : 'Bearer {{authToken}}',
            },
          ]
        : []),
    ],
    ...(entry.body
      ? {
          body: {
            mode: 'raw',
            raw: JSON.stringify(entry.body, null, 2),
            options: { raw: { language: 'json' } },
          },
        }
      : {}),
    url: {
      raw: `{{baseUrl}}${entry.path}`,
      host: ['{{baseUrl}}'],
      path: segments(pathPart),
      ...(query ? { query } : {}),
    },
    description: entry.desc,
  };
  if (!entry.auth) request.auth = { type: 'noauth' };
  return request;
}

function buildItem(entry, alsoShow) {
  const request = buildRequest(entry);

  return {
    name: entry.name,
    request,
    // The saved examples are what make the collection readable with no server:
    // the successful call first, then every way the same call can be refused.
    response: [entry, ...(alsoShow ?? [])].map((shown) => ({
      name: `${shown.code} ${shown.name.replace(/\s*\(\d{3}\)$/, '')}`,
      originalRequest: shown === entry ? request : buildRequest(shown),
      status: shown.statusText || '',
      code: shown.code,
      _postman_previewlanguage: 'json',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      cookie: [],
      body: shown.response,
    })),
  };
}

/**
 * One row per endpoint, carrying every status it can answer with.
 *
 * A refusal is not a different endpoint, so it is filed as another saved
 * example on the request that produces it. Opening a request then shows the
 * whole set — 200, 401, 422, 409 — in one place, which is what a reader wants
 * when they are working out what to handle.
 *
 * Successful calls stay as separate rows where they are separate steps of a
 * screen, because together those read as the walkthrough.
 */
function collapse(entries) {
  const rows = entries
    .filter((entry) => entry.code < 400)
    .map((entry) => ({ entry, errors: [] }));

  const orphans = [];
  for (const entry of entries.filter((candidate) => candidate.code >= 400)) {
    // Matched on method and path, wherever the successful call sits in the
    // run — a refusal recorded before it still belongs to it. `attachTo` files
    // one under a request it does not match, for the refusals that come from
    // getting the address wrong.
    const owner = rows.find((row) =>
      entry.attachTo
        ? `${row.entry.method} ${row.entry.path}` === entry.attachTo
        : row.entry.method === entry.method && row.entry.path === entry.path,
    );
    if (owner) owner.errors.push(entry);
    else orphans.push({ entry, errors: [] });
  }

  return [...rows, ...orphans].map((row) => buildItem(row.entry, row.errors));
}

/**
 * A line per folder, shown as the folder's description in Postman and as the
 * tag's description in the OpenAPI file. Keyed by the folder name so a folder
 * without one still works — it just goes undescribed.
 */
const FOLDER_NOTES = {
  '01 · App launch': 'Read once on launch: branding, the country list, and the documents to collect.',
  '02 · Request a code': 'The number goes in and a code comes back out — or a 409 saying to sign up first.',
  '03 · Sign up': 'The "Become a driver" form. Nothing is written until the code is proved.',
  '04 · Verify your number': 'Proving the code. Creates the account on a first sign-up.',
  '05 · Session': 'Everything the app knows about the signed-in driver, on every launch.',
  '06 · Refresh the session': 'A new pair of tokens, so an expiry is never a sign-in screen.',
  '07 · Upload documents': 'Every upload, on every screen, through one call keyed by document id.',
  '08 · Review your application': 'The whole application, flat, for the screen before Submit.',
  '09 · Submit the application': 'Sending it for review. Freezes every document behind it.',
  '10 · Verification in progress': 'The status screen, in each state it can be in.',
  '11 · Rides': 'Finished work: the history list and one ride in full.',
  '12 · Earnings': 'What the driver made, by day and by period.',
  '13 · Profile': 'The account screen, gathered from four places into one call.',
  '14 · Ride preferences':
    'Gender-specific riding: what the driver asked for, and whether it is being honoured.',
  '15 · Admin': 'Creating an admin account and signing one in, to hold a token for the calls below.',
  '16 · Get driver details':
    'Reading one driver in full — the account, the vehicle and the documents — and recording what only a reviewer can set.',
  '17 · Send status': 'Deciding an application — accepted, or rejected with the documents to redo.',
};

/**
 * What the collection shows: the calls themselves, and nothing else.
 *
 * Every refusal this run recorded — the 401s, the 422s, the 409s — stays in
 * the OpenAPI file, where a reader is looking one up. In Postman they only
 * crowd the dropdown of a request somebody is about to send.
 */
const collectionEntries = recorded.filter((entry) => entry.code < 400);

const folders = [...new Set(collectionEntries.map((r) => r.folder))].sort().map((name) => ({
  name,
  ...(FOLDER_NOTES[name] ? { description: FOLDER_NOTES[name] } : {}),
  item: collapse(collectionEntries.filter((r) => r.folder === name)),
}));

const collection = {
  info: {
    _postman_id: 'c41b7f92-8d63-4a15-9e07-kittaxidriverapi',
    name: 'Kit Taxi Driver API',
    description:
      'Kit Taxi Driver API — the driver onboarding backend. Node.js, Express, TypeScript, MySQL.\n\n' +
      'Every request carries the response a real run returned, saved as an example, so the ' +
      'shape is readable without a server.\n\n' +
      'Only the successful call is kept here. Every refusal the API can answer with — the ' +
      '401s, 422s and 409s, with the code and fields each one sends — is in ' +
      'Kit-Taxi-Driver-API.openapi.json beside this file, which is the better place to look ' +
      'one up.\n\n' +
      'TO RUN IT LIVE\n' +
      'Start the API with `npm run dev`, then select the "Kit Taxi Driver · Dev" environment. The ' +
      'Prod environment ships with an empty baseUrl — fill it in once the API is deployed.\n\n' +
      'AUTH\n' +
      'Two kinds of token, and neither opens the other\'s endpoints.\n\n' +
      'Nothing has to be copied by hand. A script on the collection reads every response and ' +
      'sets authToken, refreshToken, driverId and adminToken as it goes, so ' +
      'running the folders in order just works.\n\n' +
      'A driver\'s: the sign-in calls are public, and GET /session straight after /verifyOTP ' +
      'takes the verified number rather than a token. Every protected call after it sends ' +
      'the authToken as a bearer token.\n\n' +
      'An admin\'s: POST /admin/login fills adminToken, which the /admin calls send. On an ' +
      'empty database the first POST /admin/signup is activated as Super Admin; every account ' +
      'after it waits for one of those to approve it, so it cannot sign in yet.\n\n' +
      'RESPONSE SHAPE\n' +
      'Every endpoint answers { success: true, data } or { success: false, error }. error.code is ' +
      'stable and the only thing to switch on; error.message says what went wrong in plain words; ' +
      'error.fields names the rejected inputs. Every key is camelCase.\n\n' +
      'SWAGGER\n' +
      'Kit-Taxi-Driver-API.openapi.json, generated beside this file, holds the full schema. Import ' +
      'that into Swagger rather than converting this collection.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  /**
   * Runs after every request in the collection, and carries the tokens
   * forward.
   *
   * Without it the collection is a set of calls that each 401 until somebody
   * copies a token out of one response and into a variable by hand — which is
   * the first thing anyone hits, and reads as the collection being broken.
   *
   * Only ever writes on a successful response, so a refusal never clears a
   * token that still works.
   */
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          '(function () {',
          '  var body;',
          '  try { body = pm.response.json(); } catch (e) { return; }',
          '  if (!body || body.success !== true || !body.data) return;',
          '',
          '  var d = body.data;',
          '',
          "  // A driver's session, and the pair /refresh hands back.",
          "  if (d.accessToken) pm.collectionVariables.set('authToken', d.accessToken);",
          "  if (d.refreshToken) pm.collectionVariables.set('refreshToken', d.refreshToken);",
          "  if (d.driver && d.driver.id) pm.collectionVariables.set('driverId', d.driver.id);",
          '',
          "  // A reviewer's sign-in. Only /admin/login answers with both of these,",
          "  // so it cannot be mistaken for a driver's token.",
          "  if (d.token && d.admin) pm.collectionVariables.set('adminToken', d.token);",
          '})();',
        ],
      },
    },
  ],
  variable: [
    { key: 'baseUrl', value: DEV_BASE, type: 'string' },
    { key: 'authToken', value: '', type: 'string' },
    // A reviewer's token, from POST /admin/login. A different kind from the
    // driver's, and neither opens the other's endpoints.
    { key: 'adminToken', value: '', type: 'string' },
    // Every other variable a request mentions, in its path or its body, so
    // Postman never shows one unresolved. Derived, so a new one needs nothing
    // added here. The two that are inputs rather than captures get a working
    // default; the rest fill themselves in from the script below.
    ...[
      ...new Set(
        recorded.flatMap((entry) =>
          [...JSON.stringify({ path: entry.path, body: entry.body ?? null }).matchAll(
            /\{\{(\w+)\}\}/g,
          )].map((match) => match[1]),
        ),
      ),
    ]
      .filter((name) => !['baseUrl', 'authToken', 'adminToken'].includes(name))
      .map((key) => ({ key, value: VARIABLE_DEFAULTS[key] ?? '', type: 'string' })),
  ],
  item: folders,
};

writeFileSync(
  join(OUT, 'Kit-Taxi-Driver-API.postman_collection.json'),
  JSON.stringify(collection, null, 2),
);

/**
 * One environment per deployment. Only baseUrl differs — an empty environment
 * variable would shadow the collection variable of the same name, so nothing
 * else is listed here.
 */
const environments = [
  {
    file: 'Kit-Taxi-Driver-Dev.postman_environment.json',
    id: 'a7d41f60-2b98-4c33-8e51-kittaxidev',
    name: 'Kit Taxi Driver · Dev',
    baseUrl: DEV_BASE,
  },
  {
    file: 'Kit-Taxi-Driver-Prod.postman_environment.json',
    id: 'f3c92b18-6e47-4a20-b7d5-kittaxiprod',
    name: 'Kit Taxi Driver · Prod',
    baseUrl: '',
  },
];

for (const environment of environments) {
  writeFileSync(
    join(OUT, environment.file),
    JSON.stringify(
      {
        id: environment.id,
        name: environment.name,
        values: [
          { key: 'baseUrl', value: environment.baseUrl, type: 'default', enabled: true },
        ],
        _postman_variable_scope: 'environment',
      },
      null,
      2,
    ),
  );
}


// ----------------------------------------------------------- OpenAPI file
//
// A Postman collection stores example bodies, not schemas, so anything that
// converts one to Swagger has to guess — and a key that is null in the example,
// or appears in only some of them, is the kind of key a guess drops. This writes
// the schema out explicitly instead: every key seen in any recorded response is
// listed, nulls are marked nullable, and every recorded body is kept as an
// example. Import this file into Swagger directly.

function inferSchema(value) {
  if (value === null) return { nullable: true };
  if (Array.isArray(value)) {
    return { type: 'array', items: value.map(inferSchema).reduce(mergeSchema, undefined) ?? {} };
  }
  if (typeof value === 'object') {
    const properties = {};
    for (const [key, child] of Object.entries(value)) properties[key] = inferSchema(child);
    return { type: 'object', properties, required: Object.keys(value) };
  }
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  return { type: typeof value };
}

function mergeSchema(a, b) {
  if (!a) return b;
  if (!b) return a;
  const nullable = Boolean(a.nullable || b.nullable);
  if (!a.type && !b.type) return { nullable: true };
  if (!a.type) return { ...b, nullable: true };
  if (!b.type) return { ...a, nullable: true };

  let merged;
  if (a.type === 'object' && b.type === 'object') {
    const properties = { ...a.properties };
    for (const [key, schema] of Object.entries(b.properties)) {
      properties[key] = mergeSchema(properties[key], schema);
    }
    // A key is required only if every example had it.
    const required = (a.required ?? []).filter((key) => (b.required ?? []).includes(key));
    merged = { type: 'object', properties, required };
  } else if (a.type === 'array' && b.type === 'array') {
    merged = { type: 'array', items: mergeSchema(a.items, b.items) ?? {} };
  } else if (a.type === b.type) {
    merged = { type: a.type };
  } else if (['integer', 'number'].includes(a.type) && ['integer', 'number'].includes(b.type)) {
    merged = { type: 'number' };
  } else {
    merged = { oneOf: [a, b] };
  }
  return nullable ? { ...merged, nullable: true } : merged;
}

/** A key that was null in every example still needs a type Swagger can show. */
function finishSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.nullable && !schema.type && !schema.oneOf) return { type: 'string', nullable: true };
  if (schema.properties) {
    for (const key of Object.keys(schema.properties)) {
      schema.properties[key] = finishSchema(schema.properties[key]);
    }
    if (!schema.required?.length) delete schema.required;
  }
  if (schema.items) schema.items = finishSchema(schema.items);
  if (schema.oneOf) schema.oneOf = schema.oneOf.map(finishSchema);
  return schema;
}

/**
 * The request schema for an endpoint.
 *
 * One example cannot say which keys are optional — a successful sign-up that
 * happened to include lastName would mark it required. So a step names its
 * optional keys, and a partial update (every key optional) says so.
 */
function requestSchema(entries, bodies) {
  const schema = finishSchema(bodies.map(inferSchema).reduce(mergeSchema, undefined));
  const good = entries.filter((entry) => entry.code < 400);

  const stripRequired = (node) => {
    if (!node || typeof node !== 'object') return;
    delete node.required;
    Object.values(node.properties ?? {}).forEach(stripRequired);
    stripRequired(node.items);
  };

  if (good.some((entry) => entry.partial)) {
    stripRequired(schema);
    return schema;
  }

  const optional = new Set(good.flatMap((entry) => entry.optional ?? []));
  if (schema.required) {
    schema.required = schema.required.filter((key) => !optional.has(key));
    if (!schema.required.length) delete schema.required;
  }
  return schema;
}

const parseBody = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const operations = new Map();
for (const entry of recorded) {
  // A refusal filed under another request for readability is not an operation.
  if (entry.attachTo) continue;
  const key = `${entry.method} ${entry.path.split('?')[0]}`;
  if (!operations.has(key)) operations.set(key, []);
  operations.get(key).push(entry);
}

const paths = {};
for (const [key, entries] of operations) {
  const [method, path] = key.split(' ');
  // The entry whose body the spec ships, so the prose describes what a reader
  // is looking at rather than whichever call happened to be recorded first.
  const primary =
    entries.find((entry) => entry.primaryExample && entry.code < 400) ??
    entries.find((entry) => entry.code < 400) ??
    entries[0];

  // Postman writes a variable as {{driverId}}; OpenAPI wants {driverId}, and
  // wants it declared as a path parameter as well.
  const pathParams = [...path.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  const openapiPath = path.replace(/\{\{(\w+)\}\}/g, '{$1}');

  const responses = {};
  for (const code of [...new Set(entries.map((entry) => entry.code))].sort()) {
    const withCode = entries.filter((entry) => entry.code === code);
    const bodies = withCode.map((entry) => parseBody(entry.response)).filter((b) => b !== undefined);
    const examples = {};
    withCode.forEach((entry, index) => {
      const body = parseBody(entry.response);
      if (body === undefined) return;
      const id = entry.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || `example_${index}`;
      examples[id] = { summary: entry.name, value: body };
    });
    responses[code] = {
      description: withCode.map((entry) => entry.name).join(' · '),
      content: {
        'application/json': {
          schema: finishSchema(bodies.map(inferSchema).reduce(mergeSchema, undefined) ?? {}),
          examples,
        },
      },
    };
  }

  // The request schema comes from the calls that worked. The refusals send
  // deliberately wrong bodies, and would teach the schema the wrong shape.
  const goodBodies = entries.filter((entry) => entry.code < 400 && entry.body).map((entry) => entry.body);
  const operation = {
    tags: [primary.folder],
    summary: primary.name,
    description: primary.desc,
    operationId: `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, '_')}`,
    ...(() => {
      const authed = entries.filter((entry) => entry.auth).length;
      if (!authed) return {};
      return { security: authed === entries.length ? [{ bearerAuth: [] }] : [{ bearerAuth: [] }, {}] };
    })(),
    ...(() => {
      const query = new Map();
      for (const entry of entries) {
        for (const pair of (entry.path.split('?')[1] ?? '').split('&').filter(Boolean)) {
          const [name, value = ''] = pair.split('=');
          if (!query.has(name)) query.set(name, decodeURIComponent(value));
        }
      }

      // One list, so neither kind of parameter overwrites the other.
      const parameters = [
        ...pathParams.map((name) => ({
          name,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          // The value the recording actually used, so the page is readable.
          ...(vars[name] ? { example: vars[name] } : {}),
        })),
        ...[...query].map(([name, example]) => ({
          name,
          in: 'query',
          required: false,
          schema: { type: 'string' },
          example,
        })),
      ];

      return parameters.length ? { parameters } : {};
    })(),
    ...(goodBodies.length
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: requestSchema(entries, goodBodies),
                // A tool that turns this spec into requests gets one body per
                // operation, so it has to be the one that works on its own.
                example:
                  entries.find((entry) => entry.primaryExample && entry.code < 400)?.body ??
                  goodBodies[0],
              },
            },
          },
        }
      : {}),
    responses,
  };

  paths[openapiPath] ??= {};
  paths[openapiPath][method.toLowerCase()] = operation;
}

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Kit Taxi Driver API',
    version: '1.0.0',
    description:
      'Every request and response here was recorded from a running server. Each response lists every ' +
      'key seen in any recorded call, with nullable marked, so nothing is lost on import.',
  },
  servers: [{ url: BASE, description: 'Development' }],
  // What a tool folders by, when told to use tags rather than URL paths.
  tags: [...new Set(recorded.map((entry) => entry.folder))]
    .sort()
    .map((name) => ({ name, ...(FOLDER_NOTES[name] ? { description: FOLDER_NOTES[name] } : {}) })),
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
};

writeFileSync(join(OUT, 'Kit-Taxi-Driver-API.openapi.json'), JSON.stringify(openapi, null, 2));

console.log(`\npostman/Kit-Taxi-Driver-API.postman_collection.json`);
console.log('postman/Kit-Taxi-Driver-API.openapi.json');
for (const environment of environments) console.log(`postman/${environment.file}`);
const requests = folders.reduce((total, folder) => total + folder.item.length, 0);
const refusals = recorded.length - collectionEntries.length;
console.log(
  `collection: ${folders.length} folders · ${requests} requests · ${collectionEntries.length} examples`,
);
console.log(`openapi:    the same calls, plus ${refusals} refusals the collection leaves out`);

if (mismatches.length) {
  // The run walks one driver through the whole application, so a second run
  // finds them already submitted and records the wrong statuses.
  console.log(
    `\n${mismatches.length} call(s) did not return what was expected.\n` +
      'Empty the database and try again:  npm run db:reset\n' +
      mismatches.map((line) => `  ${line}`).join('\n'),
  );
  process.exitCode = 1;
}
