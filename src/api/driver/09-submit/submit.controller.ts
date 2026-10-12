import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import { validate } from '../../../common/http/validate.js';
import type { ReviewService } from '../../../modules/review/review.service.js';
import { SubmitApplicationDto } from './submit.dto.js';

/**
 * POST /submit — the Submit button under the review list.
 *
 * From here every document is frozen, so nothing changes under a reviewer who
 * is already reading it.
 */
export class SubmitController {
  constructor(private readonly service: ReviewService) {}

  post = async (req: Request, res: Response): Promise<void> => {
    const input = validate(SubmitApplicationDto, req.body);
    res.json(success(await this.service.submit(driverId(res), input)));
  };
}
