/**
 * Numbers reserved for testing.
 *
 * The national range 7000000000–7000000009 never reaches an SMS provider and
 * always accepts the same code, so the app and the mobile team can drive the
 * whole sign-in flow without a real handset.
 *
 * Everything here is gated on ALLOW_TEST_ACCOUNTS, which the environment loader
 * refuses to enable in production.
 */

/** National numbers beginning with this, plus one digit, are reserved. */
const TEST_NUMBER_PREFIX = '700000000';

/** The only code these numbers accept. */
export const TEST_OTP_CODE = '1111';

/** How many numbers the range holds: 7000000000 through 7000000009. */
const TEST_NUMBER_COUNT = 10;

/**
 * Half the range is seeded as already registered, so both branches of the
 * sign-in screen can be exercised without setting anything up:
 *
 *   700000000–700000004   unknown  → isNewUser true  → sign-up form
 *   700000005–700000009   known    → isNewUser false → straight to the code
 */
const REGISTERED_FROM = 5;

const nationalNumberAt = (index: number): string => `${TEST_NUMBER_PREFIX}${index}`;

/** Every reserved national number, in order. */
const testNationalNumbers = (): string[] =>
  Array.from({ length: TEST_NUMBER_COUNT }, (_, index) => nationalNumberAt(index));

/** The subset that should already exist as drivers. */
export const registeredTestNationalNumbers = (): string[] =>
  testNationalNumbers().slice(REGISTERED_FROM);

/**
 * Whether an E.164 number falls in the reserved range.
 *
 * Matched on the ending rather than by stripping a dial code: dial codes are
 * one to four digits, so any attempt to strip one by pattern eats part of the
 * national number for some countries.
 */
export function isTestPhone(e164: string): boolean {
  return testNationalNumbers().some((national) => e164.endsWith(national));
}

/** For the message shown when a number outside the range is refused. */
export const testRangeDescription = (): string => {
  const numbers = testNationalNumbers();
  return `${numbers[0]} to ${numbers[numbers.length - 1]}`;
};
