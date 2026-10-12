import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import type { SignUpController } from './signup.controller.js';

/** Public. */
export function signUpRoutes(controller: SignUpController): Router {
  const router = Router();
  router.post('/signup', asyncHandler(controller.post));
  return router;
}
