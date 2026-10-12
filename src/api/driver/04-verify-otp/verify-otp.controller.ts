import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { validate } from '../../../common/http/validate.js';
import type { AuthService } from '../../../modules/auth/auth.service.js';
import { VerifyOtpDto } from './verify-otp.dto.js';

/**
 * POST /verifyOTP — proves the code, and creates the account on a first sign-up.
 *
 * It returns nothing. The tokens and the driver's whole state come from the
 * session call that follows.
 */
export class VerifyOtpController {
  constructor(private readonly service: AuthService) {}

  post = async (req: Request, res: Response): Promise<void> => {
    const input = validate(VerifyOtpDto, req.body);
    await this.service.verifyOtp(input);
    res.json(success());
  };
}
