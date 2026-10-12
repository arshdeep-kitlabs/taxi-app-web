import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import type { AppConfigService } from '../../../modules/app-config/app-config.service.js';

export class AdminConfigController {
  constructor(private readonly service: AppConfigService) {}

  /** GET /admin/config — the whole stored document. */
  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(this.service.full()));
  };

  /** PUT /admin/config — replaces it, and answers with what is now stored. */
  replace = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.replace(req.body)));
  };
}
