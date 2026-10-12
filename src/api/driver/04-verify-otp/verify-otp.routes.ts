import { Router } from 'express';
import { asyncHandler } from '../../../common/http/handler.js';
import type { VerifyOtpController } from './verify-otp.controller.js';

/** Public. */
export function verifyOtpRoutes(controller: VerifyOtpController): Router {
  const router = Router();
  router.post('/verifyOTP', asyncHandler(controller.post));
  return router;
}
