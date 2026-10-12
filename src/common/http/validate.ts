import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../errors/app.error.js';

/**
 * Parses a request body, turning a schema failure into the same field map the
 * client already renders. No library-specific shape ever reaches a response.
 *
 * Typed off `z.infer` rather than `ZodType<T>`: the latter widens optional and
 * required keys, and every caller then loses what the schema just proved.
 */
export function validate<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw AppError.validation(fields);
}
