import { z } from 'zod';

/**
 * The four code boxes, plus the number they were sent to.
 *
 * The app already holds the number from the previous screen, so it sends it
 * back rather than the server keeping a session between two unauthenticated
 * calls.
 */
export const VerifyOtpDto = z.object({
  /** The ISO country code the picker shows: "GB". */
  countryCode: z
    .string()
    .trim()
    .length(2, 'INVALID_COUNTRY_CODE')
    .transform((value) => value.toUpperCase()),
  /** The dialling prefix beside it: "+44". */
  phoneCode: z.string().trim().regex(/^\+\d{1,4}$/, 'INVALID_PHONE_CODE'),
  phoneNumber: z.string().trim().min(1, 'REQUIRED'),
  /** Digits only. The length is published in /config as otp.codeLength. */
  code: z.string().trim().regex(/^\d{4,8}$/, 'INVALID_FORMAT'),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpDto>;
