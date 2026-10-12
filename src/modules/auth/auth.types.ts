/**
 * What the sign-up form gets back.
 *
 * No driver is created yet, so there is nothing to return about one. The two
 * timings drive the countdown and the resend button.
 */
export type RequestOtpResult = {
  /** 1 once the code is on its way. */
  otpSent: 1;
  /** How long before the resend button becomes tappable. */
  resendAfterSeconds: number;
  /** How many boxes the verification screen should draw. */
  codeLength: number;
  /** Development only, so the app can be driven without an SMS provider. */
  devCode?: string;
};

/**
 * A fresh pair of tokens.
 *
 * Both are replaced rather than only the short one, so a phone that is used
 * regularly never reaches the refresh token's own expiry and asks the driver
 * to sign in again for no reason.
 */
export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Verification returns nothing.
 *
 * Proving the code opens a short-lived session; the tokens and everything the
 * app needs come from the session call that follows, so this response stays a
 * bare acknowledgement.
 */
export type VerifyOtpResult = void;
