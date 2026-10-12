import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { TrackStatusController } from './track-status.controller.js';

/** Needs a driver's auth token. */
export function trackStatusRoutes(
  controller: TrackStatusController,
  tokens: TokenService,
): Router {
  const router = Router();
  router.use('/trackStatus', requireDriver(tokens));
  router.get('/trackStatus', asyncHandler(controller.get));
  return router;
}
