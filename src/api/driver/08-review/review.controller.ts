import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import type { ReviewService } from '../../../modules/review/review.service.js';

/**
 * GET /review — everything the driver is about to submit, on one screen.
 *
 * Read-only. A correction is made through PATCH /documents, the same call that
 * uploaded it in the first place, and shows up here on the next read.
 */
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.current(driverId(res))));
  };
}
