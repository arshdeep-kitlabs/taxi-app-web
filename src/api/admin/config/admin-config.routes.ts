import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireAdmin } from '../../../common/http/require-admin.js';
import type { AdminUserRepository } from '../../../modules/admin-auth/ports/admin-user-repository.port.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { AdminConfigController } from './admin-config.controller.js';

export function adminConfigRoutes(
  controller: AdminConfigController,
  tokens: TokenService,
  admins: AdminUserRepository,
): Router {
  const router = Router();
  const guard = requireAdmin(tokens, admins);

  router.get('/admin/config', guard, asyncHandler(controller.get));
  router.put('/admin/config', guard, asyncHandler(controller.replace));

  return router;
}
