import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireAdmin } from '../../../common/http/require-admin.js';
import type { AdminUserRepository } from '../../../modules/admin-auth/ports/admin-user-repository.port.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { AdminApplicationsController } from './admin-applications.controller.js';

export function adminApplicationsRoutes(
  controller: AdminApplicationsController,
  tokens: TokenService,
  admins: AdminUserRepository,
): Router {
  const router = Router();
  const guard = requireAdmin(tokens, admins);

  router.get('/admin/applications', guard, asyncHandler(controller.list));
  router.get('/admin/applications/:driverId', guard, asyncHandler(controller.detail));
  router.patch('/admin/applications/:driverId', guard, asyncHandler(controller.update));

  return router;
}
