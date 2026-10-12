import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { validate } from '../../../common/http/validate.js';
import type { AuthService } from '../../../modules/auth/auth.service.js';
import { RefreshDto } from './refresh.dto.js';

/**
 * POST /refresh — trades a refresh token for a new pair.
 *
 * The auth token is deliberately short-lived, so the app calls this quietly in
 * the background rather than sending the driver back to the sign-in screen.
 */
export class RefreshController {
  constructor(private readonly service: AuthService) {}

  post = async (req: Request, res: Response): Promise<void> => {
    const input = validate(RefreshDto, req.body);
    res.json(success(await this.service.refresh(input)));
  };
}
