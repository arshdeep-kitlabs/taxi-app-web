import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireAdmin } from '../../../common/http/require-admin.js';
import type { AdminUserRepository } from '../../../modules/admin-auth/ports/admin-user-repository.port.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { AdminAuthController } from './admin-auth.controller.js';

/**
 * Sign-up and sign-in are the only admin routes without a guard — they are how
 * a token is obtained in the first place.
 */
export function adminAuthRoutes(controller: AdminAuthController, tokens: TokenService,
  admins: AdminUserRepository,
): Router {
  const router = Router();

  router.post('/admin/signup', asyncHandler(controller.signUp));
  router.post('/admin/login', asyncHandler(controller.logIn));
  router.get('/admin/me', requireAdmin(tokens, admins), asyncHandler(controller.me));

  return router;
}
