import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app.error.js';
import type { AdminUserRepository } from '../../modules/admin-auth/ports/admin-user-repository.port.js';
import type { TokenService } from '../../modules/auth/ports/token-service.port.js';

/**
 * Turns a bearer token into the id of the member of staff holding it.
 *
 * The same shape as `requireDriver`, and deliberately a different token kind:
 * a driver's token can never open an admin endpoint, however it was obtained.
 *
 * Unlike the driver guard, this one also reads the account behind the token on
 * every request. Nothing can revoke an issued token, so without that read a
 * suspended admin would keep full access for the eight hours their token has
 * left — which would make suspending somebody a gesture rather than a control.
 * It costs one indexed primary-key lookup per admin request.
 */
export function requireAdmin(tokens: TokenService, admins: AdminUserRepository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      next(AppError.unauthorized('NO_ADMIN_TOKEN'));
      return;
    }

    const claims = tokens.verify(token);
    if (!claims) {
      next(AppError.unauthorized('ADMIN_TOKEN_EXPIRED'));
      return;
    }
    if (claims.kind !== 'admin') {
      next(AppError.unauthorized('WRONG_TOKEN_TYPE'));
      return;
    }

    admins
      .findById(claims.subject)
      .then((admin) => {
        if (!admin) {
          next(AppError.unauthorized('INVALID_ADMIN_TOKEN'));
          return;
        }
        if (admin.status !== 'active') {
          // Says which, because the person needs telling why they were stopped.
          next(
            AppError.forbidden(
              admin.status === 'suspended'
                ? 'ADMIN_SUSPENDED'
                : admin.status === 'rejected'
                  ? 'ADMIN_REJECTED'
                  : 'ADMIN_PENDING_APPROVAL',
            ),
          );
          return;
        }

        res.locals.adminId = admin.id;
        next();
      })
      .catch(next);
  };
}

/** Reads what the middleware above put there. */
export function adminId(res: Response): string {
  return res.locals.adminId as string;
}
