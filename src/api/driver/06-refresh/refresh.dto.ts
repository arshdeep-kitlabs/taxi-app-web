import { z } from 'zod';

/**
 * The refresh token the session call handed out.
 *
 * It travels in the body rather than the Authorization header, because the
 * whole point of this call is that the auth token is no longer usable.
 */
export const RefreshDto = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshInput = z.infer<typeof RefreshDto>;
