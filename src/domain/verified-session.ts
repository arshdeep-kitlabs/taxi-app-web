/**
 * Proof that a phone number was verified moments ago.
 *
 * Verification and the session call are two requests, so something has to
 * carry the result between them. This is that: written when the code is
 * proved, spent by the session call, and short-lived so a number cannot be
 * exchanged for a session long after the fact.
 */
export type VerifiedSession = {
  phone: string;
  driverId: string;
  expiresAt: number;
};

/** How long a proved code stays exchangeable for a session. */
export const SESSION_WINDOW_SECONDS = 120;
