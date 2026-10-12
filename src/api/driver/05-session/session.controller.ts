import type { Request, Response } from 'express';
import { AppError } from '../../../common/errors/app.error.js';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import { validate } from '../../../common/http/validate.js';
import type { SessionService } from '../../../modules/session/session.service.js';
import { SessionQueryDto } from './session.dto.js';

/**
 * GET /session — the tokens, who the driver is, what they may do, and their
 * documents. One response, two ways to prove who is asking:
 *
 *   straight after /verifyOTP  the verified number, as query parameters.
 *                              Once only, within two minutes of the code.
 *   every later launch         the access token, in the Authorization header.
 */
export class SessionController {
  constructor(private readonly service: SessionService) {}

  get = async (req: Request, res: Response): Promise<void> => {
    if (res.locals.driverId) {
      res.json(success(await this.service.current(driverId(res))));
      return;
    }

    // No token, and no number either: this is a later launch that lost its token.
    if (req.query.phoneNumber === undefined) {
      throw AppError.unauthorized('NO_TOKEN');
    }

    const input = validate(SessionQueryDto, req.query);
    res.json(
      success(await this.service.exchange(input.countryCode, input.phoneCode, input.phoneNumber)),
    );
  };
}
