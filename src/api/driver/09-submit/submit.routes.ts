import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { SubmitController } from './submit.controller.js';

/** Needs a driver's auth token. */
export function submitRoutes(controller: SubmitController, tokens: TokenService): Router {
  const router = Router();
  router.use('/submit', requireDriver(tokens));
  router.post('/submit', asyncHandler(controller.post));
  return router;
}
