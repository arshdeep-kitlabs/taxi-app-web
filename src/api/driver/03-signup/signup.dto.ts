import { z } from 'zod';

/**
 * The "Become a driver" form.
 *
 * Every control on that screen has a field here. Sending it validates the
 * details and sends a code; nothing is written to a driver until the code is
 * proved, so an abandoned form leaves no account behind.
 */
export const SignUpDto = z.object({
  /** The ISO country code the picker shows: "GB". */
  countryCode: z
    .string()
    .trim()
    .length(2, 'INVALID_COUNTRY_CODE')
    .transform((value) => value.toUpperCase()),
  /** The dialling prefix beside it: "+44". */
  phoneCode: z.string().trim().regex(/^\+\d{1,4}$/, 'INVALID_PHONE_CODE'),
  phoneNumber: z.string().trim().min(1, 'REQUIRED'),

  firstName: z.string().trim().min(1, 'REQUIRED'),
  /** Optional: some drivers have a single legal name. */
  lastName: z.string().trim().min(1, 'REQUIRED').optional(),
  email: z
    .string()
    .trim()
    .email('INVALID_FORMAT')
    .transform((value) => value.toLowerCase()),
  /** YYYY-MM-DD. The screen shows it as 14 / 03 / 1990. */
  dateOfBirth: z.string().trim().min(1, 'REQUIRED'),

  /**
   * What the driver says their gender is.
   *
   * Optional: a driver who skips it simply has none recorded, and a reviewer
   * can still set one later. What they say here is never taken as verified —
   * it is their word, and gender-specific riding needs a reviewer's.
   */
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'UNKNOWN_CHOICE' }) })
    .optional(),

  /**
   * The second checkbox: "Send me promotions, offers and product news".
   * Optional by design — it is consent, not a condition of signing up.
   */
  receivePromotions: z.boolean().optional().default(false),
});

export type SignUpInput = z.infer<typeof SignUpDto>;
