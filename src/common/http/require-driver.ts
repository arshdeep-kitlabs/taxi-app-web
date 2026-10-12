import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app.error.js';
import type { TokenService } from '../../modules/auth/ports/token-service.port.js';

/**
 * Turns a bearer token into a driver id, once, for every protected route.
 *
 * The id is read from the token and never from the request body, so one driver
 * cannot act as another by guessing an id.
 */
export function requireDriver(tokens: TokenService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      next(AppError.unauthorized('NO_TOKEN'));
      return;
    }

    const claims = tokens.verify(token);
    if (!claims) {
      next(AppError.unauthorized('TOKEN_EXPIRED'));
      return;
    }
    if (claims.kind !== 'auth') {
      next(AppError.unauthorized('WRONG_TOKEN_TYPE'));
      return;
    }

    res.locals.driverId = claims.subject;
    next();
  };
}

/** Reads what the middleware above put there. */
export function driverId(res: Response): string {
  return res.locals.driverId as string;
}
