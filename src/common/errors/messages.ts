/**
 * A readable sentence for every error code.
 *
 * `code` stays the contract — it is stable, and the only thing a client should
 * branch on. `message` sits beside it to say plainly what went wrong, so a
 * developer reading a failed call in Postman or a log does not have to look the
 * code up. It is written for whoever is holding the response, not for a driver:
 * the app still owns the wording its user sees.
 */
const MESSAGES: Record<string, string> = {
  // --- the request itself ---------------------------------------------------
  VALIDATION_FAILED: 'One or more fields are missing or invalid. See error.fields.',
  ROUTE_NOT_FOUND: 'No endpoint matches this method and path.',
  INTERNAL_ERROR: 'Something failed on the server. The details are in the server log.',
  FORBIDDEN: 'This driver is not allowed to do that.',

  // --- the admin panel's own sign-in ----------------------------------------
  NO_ADMIN_TOKEN: 'This endpoint needs an admin token in the Authorization header.',
  ADMIN_TOKEN_EXPIRED: 'That admin token has expired or is not valid. Sign in again.',
  INVALID_ADMIN_TOKEN: 'That token does not belong to any admin account.',
  INVALID_CREDENTIALS: 'That email address and password do not match an account.',
  ADMIN_EMAIL_IN_USE: 'An admin account already exists with that email address.',
  ADMIN_PENDING_APPROVAL:
    'This account is waiting for an existing admin to approve it, and cannot sign in yet.',
  ADMIN_SUSPENDED: 'This admin account has been suspended.',
  ADMIN_REJECTED: 'This admin account was not approved.',
  ADMIN_NOT_FOUND: 'No admin exists with that id.',
  CANNOT_CHANGE_OWN_STATUS: 'An admin cannot change the status of their own account.',
  APPLICATION_NOT_FOUND: 'No application exists for that driver. A draft has not been sent yet.',
  INVALID_TRANSITION:
    'The application is not in a state that allows this decision. An approved or rejected one is final, and an application already sent back cannot be sent back again.',
  LAST_ACTIVE_ADMIN:
    'This is the only active admin. Approve another account before standing this one down.',
  PASSWORD_TOO_SHORT: 'A password must be at least 10 characters.',
  PASSWORD_TOO_LONG: 'That password is longer than 200 characters.',
  TOO_LONG: 'That value is longer than this field accepts.',

  // --- the country and the number -------------------------------------------
  INVALID_COUNTRY_CODE: 'countryCode must be a two-letter ISO country code, such as "GB".',
  COUNTRY_NOT_SUPPORTED: 'We do not operate in that country yet.',
  INVALID_PHONE: 'That is not a phone number we can use.',
  NOT_A_TEST_NUMBER:
    'Only the reserved test numbers are accepted while ALLOW_TEST_ACCOUNTS is on. The range is in testNumberRange.',

  // --- the sign-up form -----------------------------------------------------
  EMAIL_IN_USE: 'Another driver has already signed up with that email address.',
  SIGN_UP_REQUIRED: 'No driver found. Sign up required.',
  ALREADY_REGISTERED: 'That number already belongs to a driver. Ask for a code at /requestOTP instead.',
  UNDER_MINIMUM_AGE: 'The driver is below the minimum age. The limit is in minimumAge.',
  INVALID_DATE: 'That date of birth is not a real date. It must be YYYY-MM-DD.',
  SIGN_UP_INCOMPLETE:
    'The number was verified but no sign-up details were held against it, so no account could be created. Start again from /requestOTP.',

  // --- the code -------------------------------------------------------------
  RESEND_TOO_SOON: 'A code was sent moments ago. retryAfterSeconds says how long to wait.',
  CODE_EXPIRED: 'That code has expired or was already used. Ask for a new one.',
  INVALID_CODE: 'That code is wrong. attemptsRemaining says how many tries are left.',
  TOO_MANY_ATTEMPTS: 'Too many wrong codes. Ask for a new one to start again.',

  // --- tokens and the session ------------------------------------------------
  NOT_VERIFIED:
    'This number has no recent verification to exchange. A session must be claimed within two minutes of proving the code, and only once.',
  NO_TOKEN: 'This endpoint needs an auth token in the Authorization header.',
  TOKEN_EXPIRED: 'That auth token has expired or is not valid. Call /refresh.',
  WRONG_TOKEN_TYPE: 'The wrong kind of token was sent for this endpoint.',
  REFRESH_TOKEN_EXPIRED: 'That refresh token has expired or is not valid. The driver has to sign in again.',
  DRIVER_NOT_FOUND: 'No driver exists with that id.',

  // --- documents and the vehicle ---------------------------------------------
  UNKNOWN_DOCUMENT: 'No document with that name is collected on this screen.',
  UNKNOWN_TYPE: 'That is not one of the choices this document offers.',
  NO_TYPE_TO_CHOOSE: 'This document has no dropdown, so no type can be set on it.',
  TYPE_REQUIRED: 'Choose the type first — the photos this document asks for follow that choice.',
  UNKNOWN_IMAGE_SLOT: 'This document does not have that image slot. The ones it takes are in accepts.',
  INVALID_URL: 'An image must be an http or https address.',
  UNKNOWN_FIELD: 'No field with that name belongs here.',
  UNKNOWN_CHOICE: 'That is not one of the options for this field. The ones it takes are in accepts.',
  OUT_OF_RANGE: 'That number is outside the range this field accepts. See min and max.',
  INVALID_FORMAT: 'That value is not in the shape this field expects.',
  EXPIRED: 'That document has already expired, so a reviewer could not accept it.',
  REQUIRED: 'This field cannot be left empty.',

  // --- rides and earnings -----------------------------------------------------
  RIDE_NOT_FOUND: 'No ride of yours has that id.',

  // --- the realtime connection -------------------------------------------------
  INVALID_FRAME: 'That frame was not JSON. Every message is a JSON object with an "event" key.',
  UNKNOWN_EVENT: 'No message with that event name is handled. inReplyTo says which was sent.',

  // --- gender-specific riding --------------------------------------------------
  GENDER_FEATURE_DISABLED:
    'Gender-specific riding is switched off for everyone, so this preference cannot be changed. features.genderPreference in GET /config says whether it is available.',
  GENDER_NOT_SET:
    'This driver has no gender recorded, so there is nothing to match on and gender-specific riding cannot be turned on. It is asked for at sign-up, and an admin can set one.',
  NOTHING_TO_UPDATE: 'The request body changed nothing. Send at least one field.',

  // --- submitting and reviewing ----------------------------------------------
  APPLICATION_INCOMPLETE:
    'The application still has items outstanding. missingImages and missingValues say how many.',
  ALREADY_SUBMITTED: 'This application has already been sent for checking.',
  APPLICATION_LOCKED:
    'The application cannot be changed: it is with a reviewer, or already decided. It reopens only if a reviewer asks for changes.',
  REFERENCE_UNAVAILABLE: 'Could not issue an application reference. Try again.',
};

/** Falls back to the code itself, so a new code is never left without a line. */
export function messageFor(code: string, fields?: Record<string, string>): string {
  const message = MESSAGES[code];
  if (!message) return code;

  if (code === 'VALIDATION_FAILED' && fields) {
    const named = Object.keys(fields).filter((name) => name !== '_');

    // One field with a reason of its own: say the reason, not "one or more".
    if (named.length === 1) {
      const only = named[0]!;
      const reason = MESSAGES[fields[only]!];
      if (reason) return reason;
      return `${only} is missing or invalid.`;
    }

    // Several at once: name them, so the reader is not left scrolling.
    if (named.length > 1) {
      return `These fields are missing or invalid: ${named.join(', ')}.`;
    }
  }

  return message;
}
