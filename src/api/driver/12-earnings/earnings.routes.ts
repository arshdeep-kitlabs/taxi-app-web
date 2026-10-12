import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { EarningsController } from './earnings.controller.js';

export function earningsRoutes(controller: EarningsController, tokens: TokenService): Router {
  const router = Router();
  router.get('/earnings', requireDriver(tokens), asyncHandler(controller.get));
  return router;
}
