import { z } from 'zod';

/**
 * The declaration under the review list.
 *
 * The wording belongs to the app; what reaches us is whether the box was
 * ticked, so the acceptance is recorded against the driver at submission.
 */
export const SubmitApplicationDto = z.object({
  declarationAccepted: z.boolean(),
});

export type SubmitApplicationInput = z.infer<typeof SubmitApplicationDto>;
