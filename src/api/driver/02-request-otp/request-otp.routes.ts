import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import type { RequestOtpController } from './request-otp.controller.js';

/** Public. */
export function requestOtpRoutes(controller: RequestOtpController): Router {
  const router = Router();
  router.post('/requestOTP', asyncHandler(controller.post));
  return router;
}
