import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import type { AppConfigService } from '../../../modules/app-config/app-config.service.js';

/** GET /config — the first call the app makes, before any screen paints. */
export class ConfigController {
  constructor(private readonly service: AppConfigService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(this.service.getStartupConfig()));
  };
}
