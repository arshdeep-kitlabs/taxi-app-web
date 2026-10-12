import type { AdminStatus, AdminUser } from '../../../domain/admin-user.js';

/** An admin account plus the one field nothing outside this module may see. */
export type StoredAdminUser = AdminUser & { passwordHash: string };

export type NewAdminUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: AdminStatus;
};

/**
 * Everything the sign-in flow needs from storage.
 *
 * The service speaks only to this, so the accounts could move to another
 * store — or to an identity provider — without the rules moving with them.
 */
export interface AdminUserRepository {
  /** Includes the hash, because this is what a sign-in compares against. */
  findByEmail(email: string): Promise<StoredAdminUser | null>;
  findById(id: string): Promise<AdminUser | null>;
  create(user: NewAdminUser): Promise<AdminUser>;
  /** Whether any account exists at all. Decides the bootstrap case. */
  isEmpty(): Promise<boolean>;
  list(): Promise<AdminUser[]>;
  setStatus(id: string, status: AdminStatus): Promise<AdminUser | null>;
  markSignedIn(id: string): Promise<void>;
}
