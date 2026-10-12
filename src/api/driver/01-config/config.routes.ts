import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import type { ConfigController } from './config.controller.js';

/** Public: the app has no driver yet when it calls this. */
export function configRoutes(controller: ConfigController): Router {
  const router = Router();
  router.get('/config', asyncHandler(controller.get));
  return router;
}
