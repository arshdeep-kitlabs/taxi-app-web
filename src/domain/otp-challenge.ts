import type { Gender } from './driver.js';

/**
 * A one-time code waiting to be proved.
 *
 * The sign-up form's details ride along here rather than being written to a
 * driver, so an unverified caller cannot overwrite an account they do not own.
 * They are applied only when the code is verified.
 */
export type PendingSignUp = {
  firstName: string;
  /** Optional on the sign-up form. */
  lastName: string | null;
  email: string;
  dateOfBirth: string;
  /** Optional on the sign-up form, and never verified by being sent. */
  gender: Gender | null;
  receivePromotions: boolean;
};

export type OtpChallenge = {
  /** E.164. The challenge is keyed by the number it was sent to. */
  phone: string;
  /** Stored hashed — a leaked store must not hand out working codes. */
  codeHash: string;
  attempts: number;
  expiresAt: number;
  /** Earliest the driver may ask for another code. */
  resendAfter: number;
  /** Absent when a returning driver simply asks for a fresh code. */
  pending: PendingSignUp | null;
};
