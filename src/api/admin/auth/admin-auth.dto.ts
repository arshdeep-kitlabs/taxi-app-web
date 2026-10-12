import { z } from 'zod';

/**
 * The minimum a password has to be.
 *
 * Length rather than a character-class rule: a long passphrase beats a short
 * one with a digit bolted on, and the rules that demand symbols mostly produce
 * the same password with a `1!` on the end.
 */
const Password = z
  .string()
  .min(10, 'PASSWORD_TOO_SHORT')
  .max(200, 'PASSWORD_TOO_LONG');

const Email = z
  .string()
  .trim()
  .email('INVALID_FORMAT')
  .transform((value) => value.toLowerCase());

/** The "Create an account" form on the admin panel. */
export const AdminSignUpDto = z.object({
  name: z.string().trim().min(1, 'REQUIRED').max(160, 'TOO_LONG'),
  email: Email,
  password: Password,
});

/** The sign-in form. No length rule: an old password is still checked. */
export const AdminLogInDto = z.object({
  email: Email,
  password: z.string().min(1, 'REQUIRED'),
});

/**
 * Approving, suspending or rejecting an admin account.
 *
 * There are no roles yet: every active admin can do everything. When roles
 * arrive this is where the chosen one joins the call.
 */
export const AdminUpdateDto = z.object({
  status: z.enum(['active', 'suspended', 'rejected']),
});

export type AdminSignUpInput = z.infer<typeof AdminSignUpDto>;
export type AdminLogInInput = z.infer<typeof AdminLogInDto>;
