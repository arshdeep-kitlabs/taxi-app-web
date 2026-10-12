import { AppError } from '../../common/errors/app.error.js';
import type { AdminStatus, AdminUser } from '../../domain/admin-user.js';
import type { TokenService } from '../auth/ports/token-service.port.js';
import { hashPassword, verifyPassword } from './password.js';
import type { AdminUserRepository } from './ports/admin-user-repository.port.js';
import type { LogInInput, Session, SignUpInput, SignUpResult } from './admin-auth.types.js';

/**
 * A hash of nothing, compared against when no account matches the address.
 *
 * Without it, a sign-in for an unknown address returns noticeably faster than
 * one for a known address with the wrong password, and that difference is
 * enough to enumerate who has an account here.
 */
const ABSENT_ACCOUNT_HASH =
  'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

/**
 * Who may use the admin panel.
 *
 * Deliberately separate from the driver `AuthService`: a driver proves a phone
 * number and a member of staff holds a password, and the two should not share
 * a code path that could ever confuse one for the other.
 */
export class AdminAuthService {
  constructor(
    private readonly admins: AdminUserRepository,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Creates an account that cannot yet sign in.
   *
   * The exception is the first account on a fresh install: there is nobody to
   * approve it, so it is activated as Super Admin. Every account after it
   * waits for one of those.
   */
  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const email = input.email.trim().toLowerCase();

    if (await this.admins.findByEmail(email)) {
      throw AppError.conflict('ADMIN_EMAIL_IN_USE', { email: 'EMAIL_IN_USE' });
    }

    const isFirstAccount = await this.admins.isEmpty();

    const admin = await this.admins.create({
      id: `adm_${Math.random().toString(36).slice(2, 10)}`,
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      status: isFirstAccount ? 'active' : 'pending',
    });

    return { admin, activated: isFirstAccount };
  }

  /**
   * Trades an email and password for a token.
   *
   * A wrong address and a wrong password fail identically, as the same code
   * and after the same work, so neither answer says whether the account
   * exists. A status that is not `active` is the one case that says more —
   * that is intentional, because the person needs telling why.
   */
  async logIn(input: LogInInput): Promise<Session> {
    const email = input.email.trim().toLowerCase();
    const stored = await this.admins.findByEmail(email);

    const matches = await verifyPassword(input.password, stored?.passwordHash ?? ABSENT_ACCOUNT_HASH);
    if (!stored || !matches) {
      throw AppError.unauthorized('INVALID_CREDENTIALS');
    }

    this.assertCanSignIn(stored.status);

    await this.admins.markSignedIn(stored.id);

    return {
      token: this.tokens.issueAdminToken(stored.id),
      expiresIn: this.tokens.adminTokenLifetimeSeconds,
      // Read back so `lastLoginAt` reflects the sign-in that just happened.
      admin: (await this.admins.findById(stored.id)) ?? this.withoutHash(stored),
    };
  }

  /**
   * A fixed reviewer account for development, so recording the API never
   * depends on `admin_users` being empty.
   *
   * Without it, the only account that can sign in straight away is the first
   * one on a fresh table — so every recording run meant clearing the table,
   * and clearing the table meant deleting whoever was using the panel. Seeded
   * active, because there is nobody to approve it and it exists to be signed
   * in as.
   *
   * Called from the container only while test accounts are enabled, beside the
   * reserved test drivers. It leaves an existing account with this address
   * alone, including its password.
   */
  async seedReviewer(email: string, password: string): Promise<void> {
    if (await this.admins.findByEmail(email)) return;

    await this.admins.create({
      id: `adm_seed_${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: 'Priya Raman',
      passwordHash: await hashPassword(password),
      status: 'active',
    });
  }

  /** The account behind a token, for the panel to rehydrate a session. */
  async me(adminId: string): Promise<AdminUser> {
    const admin = await this.admins.findById(adminId);
    if (!admin) throw AppError.unauthorized('INVALID_ADMIN_TOKEN');

    // A token outlives a suspension, so the status is checked here too. Without
    // this, revoking an account would not take effect until the token expired.
    this.assertCanSignIn(admin.status);
    return admin;
  }

  async list(): Promise<AdminUser[]> {
    return this.admins.list();
  }

  /**
   * Approves, suspends or rejects an account, changes its role, or both.
   *
   * Two things are refused when a status is changing, because both end with
   * nobody able to get in: changing your own status, and standing down the
   * last active admin. Neither applies to a role change — moving yourself
   * between roles locks nobody out.
   */
  async update(
    actingAdminId: string,
    targetId: string,
    changes: { status?: Extract<AdminStatus, 'active' | 'suspended' | 'rejected'> },
  ): Promise<AdminUser> {
    const target = await this.admins.findById(targetId);
    if (!target) throw AppError.notFound('ADMIN_NOT_FOUND');

    let updated = target;

    if (changes.status && changes.status !== target.status) {
      if (actingAdminId === targetId) {
        throw AppError.forbidden('CANNOT_CHANGE_OWN_STATUS');
      }

      if (changes.status !== 'active' && target.status === 'active') {
        const activeCount = (await this.admins.list()).filter((a) => a.status === 'active').length;
        if (activeCount <= 1) {
          throw AppError.forbidden('LAST_ACTIVE_ADMIN');
        }
      }

      updated = (await this.admins.setStatus(targetId, changes.status)) ?? updated;
    }

    return updated;
  }

  private assertCanSignIn(status: AdminStatus): void {
    if (status === 'pending') throw AppError.forbidden('ADMIN_PENDING_APPROVAL');
    if (status === 'suspended') throw AppError.forbidden('ADMIN_SUSPENDED');
    if (status === 'rejected') throw AppError.forbidden('ADMIN_REJECTED');
  }

  private withoutHash(stored: AdminUser & { passwordHash: string }): AdminUser {
    const { passwordHash: _ignored, ...admin } = stored;
    return admin;
  }
}
