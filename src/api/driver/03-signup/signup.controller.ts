import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { validate } from '../../../common/http/validate.js';
import type { AuthService } from '../../../modules/auth/auth.service.js';
import { SignUpDto } from './signup.dto.js';

/**
 * POST /signup — the sign-up form, for a number we have never seen.
 *
 * It checks the details and sends a code, and returns nothing else. The
 * account itself is created when that code is proved, so a form nobody
 * finishes leaves nothing behind.
 */
export class SignUpController {
  constructor(private readonly service: AuthService) {}

  post = async (req: Request, res: Response): Promise<void> => {
    const input = validate(SignUpDto, req.body);
    await this.service.signUp(input);
    res.json(success());
  };
}
