import type { NextFunction, Request, Response } from 'express';
import { isAppError } from '../errors/app.error.js';
import { messageFor } from '../errors/messages.js';
import type { ApiFailure } from './envelope.js';

/** The single place an exception becomes a response body. Registered last. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(error)) {
    const body: ApiFailure = {
      success: false,
      error: {
        code: error.code,
        // A plain sentence beside the code, for whoever is reading the
        // response. The app still shows its own wording to the driver.
        message: messageFor(error.code, error.fields),
        ...(error.fields ? { fields: error.fields } : {}),
        ...(error.extra ?? {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  console.error('[unhandled]', error);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: messageFor('INTERNAL_ERROR') },
  } satisfies ApiFailure);
}

/** Anything no route matched. Registered just before the handler above. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: messageFor('ROUTE_NOT_FOUND') },
  } satisfies ApiFailure);
}
