import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { adminId } from '../../../common/http/require-admin.js';
import { validate } from '../../../common/http/validate.js';
import type { AdminAuthService } from '../../../modules/admin-auth/admin-auth.service.js';
import { AdminLogInDto, AdminSignUpDto } from './admin-auth.dto.js';

export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  /** POST /admin/signup — public. Creates an account awaiting approval. */
  signUp = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.signUp(validate(AdminSignUpDto, req.body));
    res.status(201).json(success(result));
  };

  /** POST /admin/login — public. Trades an email and password for a token. */
  logIn = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.logIn(validate(AdminLogInDto, req.body))));
  };

  /**
   * GET /admin/me — the account behind the token.
   *
   * The panel calls this on every load to rehydrate a session it stored, which
   * is also what makes a suspension take effect before the token expires.
   */
  me = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.me(adminId(res))));
  };
}
