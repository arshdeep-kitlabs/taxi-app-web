import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { ReviewController } from './review.controller.js';

/** Needs a driver's access token. */
export function reviewRoutes(controller: ReviewController, tokens: TokenService): Router {
  const router = Router();
  router.get('/review', requireDriver(tokens), asyncHandler(controller.get));
  return router;
}
