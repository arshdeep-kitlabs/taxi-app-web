import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { RidePreferencesController } from './ride-preferences.controller.js';

export function ridePreferencesRoutes(
  controller: RidePreferencesController,
  tokens: TokenService,
): Router {
  const router = Router();
  const guard = requireDriver(tokens);

  router.get('/ridePreferences', guard, asyncHandler(controller.get));
  router.patch('/ridePreferences', guard, asyncHandler(controller.update));

  return router;
}
