export type AdminUserId = string;

/**
 * Where an admin account stands.
 *
 * Signing up creates a `pending` account that cannot sign in. An existing
 * admin moves it to `active`, or to `rejected` if they do not recognise the
 * person. `suspended` is for an account that was active and should not be.
 *
 * Only `active` may sign in. Everything else is refused at the login call, so
 * a decision takes effect the next time the person tries, without anything
 * having to revoke a token.
 */
export type AdminStatus = 'pending' | 'active' | 'suspended' | 'rejected';

/**
 * A member of staff who uses the admin panel.
 *
 * Separate from `Driver` on purpose: a driver proves a phone number and is a
 * customer of the platform, while an admin holds a password and acts on other
 * people's accounts. Nothing links the two tables.
 */
export type AdminUser = {
  id: AdminUserId;
  /** Lower-cased, and the only thing a sign-in resolves against. */
  email: string;
  name: string;
  status: AdminStatus;
  createdAt: string;
  lastLoginAt: string | null;
};
