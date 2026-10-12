import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { validate } from '../../../common/http/validate.js';
import type { AuthService } from '../../../modules/auth/auth.service.js';
import { RequestOtpDto } from './request-otp.dto.js';

/**
 * POST /requestOTP — the Login button.
 *
 * A country, a number, and nothing else. A driver we already know gets a code.
 * A number we have never seen is refused with SIGN_UP_REQUIRED, which is the
 * app's signal to show the sign-up form and call /signup instead.
 */
export class RequestOtpController {
  constructor(private readonly service: AuthService) {}

  post = async (req: Request, res: Response): Promise<void> => {
    const input = validate(RequestOtpDto, req.body);
    res.json(success(await this.service.requestOtp(input)));
  };
}
