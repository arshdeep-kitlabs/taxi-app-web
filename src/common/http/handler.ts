import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps an async route so a rejected promise reaches the error middleware.
 * Without this, an async throw in Express 5 still needs forwarding by hand.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
