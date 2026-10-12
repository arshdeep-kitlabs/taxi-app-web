import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import type { GenderPreferenceService } from '../../../modules/gender-preference/gender-preference.service.js';
import type { UpdateRidePreferencesInput } from '../../../modules/gender-preference/gender-preference.types.js';

export class RidePreferencesController {
  constructor(private readonly service: GenderPreferenceService) {}

  /** GET /ridePreferences — the gender-specific riding screen. */
  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.get(driverId(res))));
  };

  /** PATCH /ridePreferences — turn the mode on or off, or change the choice. */
  update = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as UpdateRidePreferencesInput;
    res.json(success(await this.service.update(driverId(res), body)));
  };
}
