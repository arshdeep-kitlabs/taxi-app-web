import { z } from 'zod';

/**
 * The number that was just verified, sent as query parameters.
 *
 * Only used on the first call after /verifyOTP, before the driver holds a token.
 * A "+" in a query string arrives as a space unless it is encoded, so the prefix
 * is accepted either way: "%2B44" and a bare "44" both mean "+44".
 */
export const SessionQueryDto = z.object({
  countryCode: z
    .string()
    .trim()
    .length(2, 'INVALID_COUNTRY_CODE')
    .transform((value) => value.toUpperCase()),
  phoneCode: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/^(?=\d)/, '+') : value),
    z.string().regex(/^\+\d{1,4}$/, 'INVALID_PHONE_CODE'),
  ),
  phoneNumber: z.string().trim().min(1, 'REQUIRED'),
});
