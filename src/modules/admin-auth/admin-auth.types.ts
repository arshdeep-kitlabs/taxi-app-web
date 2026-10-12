import type { AdminStatus, AdminUser } from '../../domain/admin-user.js';

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
};

export type LogInInput = {
  email: string;
  password: string;
};

/** What the panel gets back once a sign-in succeeds. */
export type Session = {
  token: string;
  /** Seconds. Lets the panel sign out on its own rather than wait for a 401. */
  expiresIn: number;
  admin: AdminUser;
};

/** What a sign-up returns: an account, but no token until it is approved. */
export type SignUpResult = {
  admin: AdminUser;
  /**
   * True when this was the first account and it was activated immediately.
   * The panel uses it to decide between "you're in" and "wait for approval".
   */
  activated: boolean;
};

export type AdminUserRow = AdminUser & {
  /** Resolved for display. The roles themselves are not a table yet. */
  roleName: string;
};

export type StatusChange = {
  status: Extract<AdminStatus, 'active' | 'suspended' | 'rejected'>;
};
