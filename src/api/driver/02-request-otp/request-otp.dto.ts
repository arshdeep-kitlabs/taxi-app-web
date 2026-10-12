import { z } from 'zod';

/**
 * The sign-in screen: a country and a number, and nothing else.
 *
 * This is what the Login button sends. A number we do not know is refused with
 * SIGN_UP_REQUIRED, which is the app's signal to show the sign-up form and
 * call /signup instead.
 */
export const RequestOtpDto = z.object({
  /** The ISO country code the picker shows: "GB". */
  countryCode: z
    .string()
    .trim()
    .length(2, 'INVALID_COUNTRY_CODE')
    .transform((value) => value.toUpperCase()),
  /** The dialling prefix beside it: "+44". */
  phoneCode: z.string().trim().regex(/^\+\d{1,4}$/, 'INVALID_PHONE_CODE'),
  phoneNumber: z.string().trim().min(1, 'REQUIRED'),
});

export type RequestOtpInput = z.infer<typeof RequestOtpDto>;
