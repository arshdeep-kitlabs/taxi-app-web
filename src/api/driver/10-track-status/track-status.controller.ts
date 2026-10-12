import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import type { ReviewService } from '../../../modules/review/review.service.js';

/**
 * GET /trackStatus — the screen the driver watches after submitting.
 *
 * Where the application stands, when it moved, and which documents a reviewer
 * sent back. Every line of copy on that screen belongs to the app: a timestamp
 * travels, not "started 2 hours ago".
 */
export class TrackStatusController {
  constructor(private readonly service: ReviewService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.track(driverId(res))));
  };
}
