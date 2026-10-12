/**
 * One response shape for the whole API.
 *
 * `success` is the discriminator: true means read `data`, false means read
 * `error`, without inspecting the HTTP status first.
 *
 * A failure carries a stable `code` to switch on and a `message` that says
 * plainly what went wrong. The message is for the developer holding the
 * response; the wording a driver sees is still the app's, chosen from the
 * code, so translation never needs a deploy of this service.
 */
type ApiSuccess<T> = { success: true; data?: T };

export type ApiFailure = {
  success: false;
  error: {
    /** Stable, and the only thing a client should switch on. */
    code: string;
    /**
     * A plain sentence saying what went wrong, for whoever is holding the
     * response — a developer in Postman, or a line in a log. The app shows its
     * own wording to the driver, chosen from `code`, so this never needs
     * translating.
     */
    message: string;
    /**
     * Which inputs were rejected and why, keyed by field name. The values are
     * codes too, so the app can show a different message per problem.
     */
    fields?: Record<string, string>;
    /** Anything the app needs to act, such as retryAfterSeconds. Never prose. */
    [key: string]: unknown;
  };
};

/** Omitting `data` sends `{ success: true }` alone, for endpoints with nothing to return. */
export const success = <T>(data?: T): ApiSuccess<T> =>
  data === undefined ? { success: true } : { success: true, data };
