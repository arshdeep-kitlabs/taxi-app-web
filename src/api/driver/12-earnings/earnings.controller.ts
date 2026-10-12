import type { Request, Response } from 'express';
import { AppError } from '../../../common/errors/app.error.js';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import type { EarningsPeriod } from '../../../modules/rides/rides.types.js';
import type { RidesService } from '../../../modules/rides/rides.service.js';

const PERIODS: EarningsPeriod[] = ['today', 'week', 'month'];

export class EarningsController {
  constructor(private readonly service: RidesService) {}

  /** GET /earnings?period=today|week|month — the three tabs on that screen. */
  get = async (req: Request, res: Response): Promise<void> => {
    // Defaults to the tab the screen opens on rather than refusing a bare call.
    const asked = req.query.period ? String(req.query.period) : 'week';

    if (!PERIODS.includes(asked as EarningsPeriod)) {
      throw AppError.validation({ period: 'UNKNOWN_CHOICE' }, { accepts: PERIODS });
    }

    res.json(success(await this.service.earnings(driverId(res), asked as EarningsPeriod)));
  };
}
