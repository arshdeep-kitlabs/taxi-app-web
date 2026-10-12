import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import { AppError } from '../../../common/errors/app.error.js';
import type { RideStatus } from '../../../domain/ride.js';
import type { RidesService } from '../../../modules/rides/rides.service.js';

const STATUSES: RideStatus[] = ['completed', 'cancelled'];

export class RidesController {
  constructor(private readonly service: RidesService) {}

  /** GET /rides — the history screen, newest first, a page at a time. */
  list = async (req: Request, res: Response): Promise<void> => {
    // Named the same as the field it came from, so there is one word for it.
    const loadMoreBefore = req.query.loadMoreBefore
      ? String(req.query.loadMoreBefore)
      : undefined;

    // What the filter control on that screen narrows to. Absent means all.
    const asked = req.query.status ? String(req.query.status) : undefined;
    if (asked && !STATUSES.includes(asked as RideStatus)) {
      throw AppError.validation({ status: 'UNKNOWN_CHOICE' }, { accepts: STATUSES });
    }

    res.json(
      success(await this.service.history(driverId(res), loadMoreBefore, asked as RideStatus)),
    );
  };

  /** GET /rides/:rideId — the receipt shown when a ride ends. */
  detail = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.receipt(driverId(res), String(req.params.rideId))));
  };
}
