import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { ProfileController } from './profile.controller.js';

export function profileRoutes(controller: ProfileController, tokens: TokenService): Router {
  const router = Router();
  router.get('/profile', requireDriver(tokens), asyncHandler(controller.get));
  return router;
}
