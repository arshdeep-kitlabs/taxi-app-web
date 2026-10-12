import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import type { RefreshController } from './refresh.controller.js';

/**
 * Public: the proof travels in the body, because by the time this is called
 * the auth token has usually expired and cannot renew itself.
 */
export function refreshRoutes(controller: RefreshController): Router {
  const router = Router();
  router.post('/refresh', asyncHandler(controller.post));
  return router;
}
