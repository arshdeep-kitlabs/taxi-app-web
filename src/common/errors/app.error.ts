/**
 * The only error type the HTTP layer knows how to translate.
 *
 * It carries a code, never a sentence. The message passed to `Error` is the
 * code itself, so server logs stay readable while nothing human-facing reaches
 * a response.
 */
export class AppError extends Error {
  /**
   * A brand rather than a bare `instanceof` check, so an error still reports
   * correctly if this module is ever loaded twice in one process.
   */
  readonly isAppError = true as const;

  constructor(
    readonly status: number,
    readonly code: string,
    /** Per-input codes, keyed by field name. */
    readonly fields?: Record<string, string>,
    /** Data the app needs to act on, such as retryAfterSeconds. */
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'AppError';
  }

  static validation(fields: Record<string, string>, extra?: Record<string, unknown>): AppError {
    return new AppError(422, 'VALIDATION_FAILED', fields, extra);
  }

  static notFound(code: string): AppError {
    return new AppError(404, code);
  }

  static conflict(code: string, fields?: Record<string, string>): AppError {
    return new AppError(409, code, fields);
  }

  static unauthorized(code: string): AppError {
    return new AppError(401, code);
  }

  static forbidden(code = 'FORBIDDEN'): AppError {
    return new AppError(403, code);
  }
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { isAppError?: unknown }).isAppError === true
  );
}
