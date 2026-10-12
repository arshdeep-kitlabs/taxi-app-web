import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import { requireDriver } from '../../../common/http/require-driver.js';
import type { TokenService } from '../../../modules/auth/ports/token-service.port.js';
import type { SessionController } from './session.controller.js';

/**
 * A token is checked when one is sent. Without one, the controller looks for
 * the just-verified number instead.
 */
export function sessionRoutes(controller: SessionController, tokens: TokenService): Router {
  const router = Router();
  const checkToken = requireDriver(tokens);

  router.get(
    '/session',
    (req, res, next) => (req.headers.authorization ? checkToken(req, res, next) : next()),
    asyncHandler(controller.get),
  );
  return router;
}
