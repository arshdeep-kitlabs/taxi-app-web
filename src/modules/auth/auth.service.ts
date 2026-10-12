import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../common/errors/app.error.js';
import type { Driver } from '../../domain/driver.js';
import type { PendingSignUp } from '../../domain/otp-challenge.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import type { RefreshResult, RequestOtpResult, VerifyOtpResult } from './auth.types.js';
import { assertOldEnough } from './date-of-birth.js';
import type { RefreshInput } from '../../api/driver/06-refresh/refresh.dto.js';
import type { RequestOtpInput } from '../../api/driver/02-request-otp/request-otp.dto.js';
import type { SignUpInput } from '../../api/driver/03-signup/signup.dto.js';
import type { VerifyOtpInput } from '../../api/driver/04-verify-otp/verify-otp.dto.js';
import { toE164 } from './phone-number.js';
import { resolveCountry } from './country-code.js';
import type { DriverRepository } from './ports/driver-repository.port.js';
import type { OtpChallengeRepository } from './ports/otp-challenge-repository.port.js';
import type { OtpSender } from './ports/otp-sender.port.js';
import type { TokenService } from './ports/token-service.port.js';
import type { VerifiedSessionRepository } from '../session/ports/verified-session-repository.port.js';
import { SESSION_WINDOW_SECONDS } from '../../domain/verified-session.js';
import { TEST_OTP_CODE, isTestPhone, testRangeDescription } from './test-accounts.js';

/** Wrong codes allowed before the challenge is locked and a new one is needed. */
const MAX_ATTEMPTS = 5;

type AuthServiceOptions = {
  /** Returns the code in the response, for development only. */
  exposeCode: boolean;
  /** Enables the reserved test range and its fixed code. */
  allowTestAccounts: boolean;
};

/**
 * Sign-in and sign-up.
 *
 * Phone is the only method today. Email and the social providers are switched
 * off in config and unimplemented here; adding one means a new method and a new
 * schema, not a rewrite, because every method resolves to the same driver.
 */
export class AuthService {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly challenges: OtpChallengeRepository,
    private readonly sender: OtpSender,
    private readonly config: ConfigSource,
    private readonly tokens: TokenService,
    private readonly verifiedSessions: VerifiedSessionRepository,
    private readonly options: AuthServiceOptions,
  ) {}

  private otpSettings() {
    return this.config.load().otp;
  }

  /**
   * The Login button: sends a code to a driver we already know.
   *
   * A number we have never seen is refused rather than quietly signed up, so
   * the app knows to show the sign-up form and call /signup instead.
   */
  async requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
    const phone = this.toPhone(input.countryCode, input.phoneCode, input.phoneNumber);

    if (!(await this.drivers.findByPhone(phone))) {
      throw AppError.conflict('SIGN_UP_REQUIRED');
    }

    return this.sendCode(phone, null);
  }

  /**
   * The sign-up form: checks the details, then sends a code.
   *
   * The details ride on the challenge rather than being written to a driver,
   * so someone who never proves the number cannot create an account — nor
   * overwrite one that already exists.
   */
  async signUp(input: SignUpInput): Promise<void> {
    const phone = this.toPhone(input.countryCode, input.phoneCode, input.phoneNumber);

    if (await this.drivers.findByPhone(phone)) {
      // Signing up over an existing account would let anyone who knows the
      // number rewrite its details.
      throw AppError.conflict('ALREADY_REGISTERED');
    }

    // Nothing comes back: the code is on its way, and the verification screen
    // already knows what it needs to draw.
    await this.sendCode(phone, await this.validateSignUp(input));
  }

  /** Everything both branches share once the number has been settled. */
  private async sendCode(phone: string, pending: PendingSignUp | null): Promise<RequestOtpResult> {
    const previous = await this.challenges.find(phone);
    if (previous && previous.resendAfter > Date.now()) {
      const seconds = Math.ceil((previous.resendAfter - Date.now()) / 1000);
      throw new AppError(429, 'RESEND_TOO_SOON', undefined, { retryAfterSeconds: seconds });
    }

    const otp = this.otpSettings();
    const code = this.codeFor(phone);

    await this.challenges.save({
      phone,
      codeHash: this.hash(code),
      attempts: 0,
      expiresAt: Date.now() + otp.expiresInMinutes * 60_000,
      resendAfter: Date.now() + otp.resendAfterSeconds * 1000,
      pending,
    });

    // A reserved test number never reaches a provider — its code is fixed.
    if (!this.isTestAccount(phone)) {
      await this.sender.send(phone, code);
    }

    return {
      otpSent: 1,
      resendAfterSeconds: otp.resendAfterSeconds,
      codeLength: otp.codeLength,
      ...(this.options.exposeCode ? { devCode: code } : {}),
    };
  }

  /**
   * Proves the code.
   *
   * This is where a driver record is created, from the details the sign-up form
   * left on the challenge, so an abandoned form leaves nothing behind.
   *
   * It returns nothing. Proving the number opens a short-lived session which
   * the session call then exchanges for tokens and the driver's whole state —
   * one place for the app to look rather than two responses to stitch together.
   */
  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const phone = this.toPhone(input.countryCode, input.phoneCode, input.phoneNumber);
    const challenge = await this.challenges.find(phone);

    if (!challenge || challenge.expiresAt < Date.now()) {
      throw new AppError(410, 'CODE_EXPIRED');
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new AppError(423, 'TOO_MANY_ATTEMPTS');
    }

    if (!this.matchesCode(input.code, challenge.codeHash)) {
      challenge.attempts += 1;
      await this.challenges.save(challenge);

      const remaining = MAX_ATTEMPTS - challenge.attempts;
      throw new AppError(401, 'INVALID_CODE', { code: 'INVALID_CODE' }, {
        attemptsRemaining: remaining,
      });
    }

    // Burn it first: a proved code must never be usable twice.
    await this.challenges.remove(phone);

    const driver =
      (await this.drivers.findByPhone(phone)) ?? (await this.createDriver(phone, challenge.pending));

    // No tokens here. The proof is held for two minutes, and the session call
    // spends it to hand out the tokens and the driver's state.
    await this.verifiedSessions.save({
      phone,
      driverId: driver.id,
      expiresAt: Date.now() + SESSION_WINDOW_SECONDS * 1000,
    });
  }

  /**
   * Trades a refresh token for a new pair.
   *
   * The auth token is deliberately short-lived, so the app hits this quietly
   * in the background rather than sending the driver back to the sign-in
   * screen every hour. It takes only a refresh token: an expired auth token
   * cannot be renewed with itself.
   */
  async refresh(input: RefreshInput): Promise<RefreshResult> {
    const claims = this.tokens.verify(input.refreshToken);

    if (!claims) {
      throw AppError.unauthorized('REFRESH_TOKEN_EXPIRED');
    }
    if (claims.kind !== 'refresh') {
      throw AppError.unauthorized('WRONG_TOKEN_TYPE');
    }

    // The account may have gone since the token was issued.
    const driver = await this.drivers.findById(claims.subject);
    if (!driver) {
      throw AppError.unauthorized('DRIVER_NOT_FOUND');
    }

    return {
      accessToken: this.tokens.issueAuthToken(driver.id),
      refreshToken: this.tokens.issueRefreshToken(driver.id),
    };
  }

  /**
   * Creates the account from what the sign-up form left on the challenge.
   *
   * A missing `pending` means the number was never taken through the form —
   * possible only if the driver was deleted between the two calls.
   */
  private async createDriver(phone: string, pending: PendingSignUp | null): Promise<Driver> {
    if (!pending) {
      throw new AppError(409, 'SIGN_UP_INCOMPLETE');
    }

    return this.drivers.create({
      id: `drv_${Math.random().toString(36).slice(2, 10)}`,
      // Assigned by the database on insert.
      number: 0,
      phone,
      email: pending.email,
      firstName: pending.firstName,
      lastName: pending.lastName,
      dateOfBirth: pending.dateOfBirth,
      acceptedTermsAt: null,
      receivePromotions: pending.receivePromotions,
      createdAt: new Date().toISOString(),
      applicationStatus: 'draft',
      reference: null,
      submittedAt: null,
      reviewedAt: null,
      rejectedDocuments: [],
      rejection: null,
      city: null,
      rating: null,
      totalRides: 0,
      earnings: 0,
      accountStatus: 'active',
      // What the driver said on the form, if they said anything. It is stored
      // without a verification stamp, so it shows on their profile and still
      // cannot switch gender-specific riding on: a reviewer has to confirm it
      // against the identity document first.
      gender: pending.gender,
      genderVerifiedAt: null,
      genderSpecificModeEnabled: false,
      passengerGenderPreference: 'ANY',
    });
  }

  /**
   * Everything the sign-up form must satisfy before a code is worth sending.
   *
   * Each field is reported under its own name, so the form highlights the
   * control the driver has to fix rather than showing one vague message.
   */
  private async validateSignUp(input: SignUpInput): Promise<PendingSignUp> {
    assertOldEnough(input.dateOfBirth, this.config.load().rules.minimumAgeYears, new Date());

    if (await this.drivers.findByEmail(input.email)) {
      throw AppError.conflict('EMAIL_IN_USE', { email: 'ALREADY_IN_USE' });
    }

    return {
      firstName: input.firstName,
      // Optional on the form, so it may never be supplied.
      lastName: input.lastName ?? null,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      // Their word, not a verified fact. createDriver stores it with no
      // verification stamp, which is what keeps it out of the matching rule.
      gender: input.gender ?? null,
      receivePromotions: input.receivePromotions,
    };
  }

  /**
   * Joins the two phone controls, rejects a country we do not serve, and — while
   * test accounts are on — refuses anything outside the reserved range.
   *
   * That last rule is what keeps a development server from ever sending a
   * message to a real handset, or from collecting a real person's details.
   */
  private toPhone(countryCode: string, phoneCode: string, phoneNumber: string): string {
    const country = resolveCountry(countryCode, phoneCode, this.config.load().signIn.countries);
    const phone = toE164(country.dialCode, phoneNumber);

    if (this.options.allowTestAccounts && !isTestPhone(phone)) {
      // The allowed range travels as data, so the app can word the hint itself.
      throw AppError.validation({ phoneNumber: 'NOT_A_TEST_NUMBER' }, {
        testNumberRange: testRangeDescription(),
      });
    }

    return phone;
  }

  private isTestAccount(phone: string): boolean {
    return this.options.allowTestAccounts && isTestPhone(phone);
  }

  private codeFor(phone: string): string {
    if (this.isTestAccount(phone)) return TEST_OTP_CODE;

    const { codeLength } = this.otpSettings();
    const lowest = 10 ** (codeLength - 1);
    return String(randomInt(lowest, lowest * 10));
  }

  private hash(code: string): string {
    return createHmac('sha256', 'otp').update(code).digest('hex');
  }

  /** Kept beside the hash so the comparison can never drift from it. */
  private matchesCode(code: string, hash: string): boolean {
    const candidate = this.hash(code);
    if (candidate.length !== hash.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
  }
}
