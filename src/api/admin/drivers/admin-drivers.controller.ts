import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import type { AdminService } from '../../../modules/admin/admin.service.js';
import type { AccountStatus } from '../../../domain/driver.js';

const STATUSES: AccountStatus[] = ['active', 'suspended', 'blocked'];

export class AdminDriversController {
  constructor(private readonly service: AdminService) {}

  /** GET /admin/drivers — directory list */
  list = async (req: Request, res: Response): Promise<void> => {
    const status = String(req.query.status ?? '') as AccountStatus;
    res.json(
      success(
        await this.service.directory({
          search: req.query.search ? String(req.query.search) : undefined,
          status: STATUSES.includes(status) ? status : undefined,
        }),
      ),
    );
  };

  /** GET /admin/drivers/:driverId — full profile */
  profile = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.driverProfile(String(req.params['driverId']))));
  };

  /** PATCH /admin/drivers/:driverId — update status and/or profile fields */
  update = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.updateDriver(String(req.params['driverId']), req.body)));
  };
}
