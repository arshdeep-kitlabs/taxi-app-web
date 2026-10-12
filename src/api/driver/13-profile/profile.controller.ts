import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import type { ProfileService } from '../../../modules/profile/profile.service.js';

export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  /** GET /profile — the account screen, in one call. */
  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.get(driverId(res))));
  };
}
