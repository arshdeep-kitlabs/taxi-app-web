import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { RidesController } from './rides.controller.js';

/** Every ride route reads the driver from the token, never from the path. */
export function ridesRoutes(controller: RidesController, tokens: TokenService): Router {
  const router = Router();
  const guard = requireDriver(tokens);

  router.get('/rides', guard, asyncHandler(controller.list));
  router.get('/rides/:rideId', guard, asyncHandler(controller.detail));

  return router;
}
