import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { DocumentsController } from './documents.controller.js';

/** Needs a driver's access token. */
export function documentsRoutes(controller: DocumentsController, tokens: TokenService): Router {
  const router = Router();
  router.patch('/documents', requireDriver(tokens), asyncHandler(controller.patch));
  return router;
}
