import { z } from 'zod';

/**
 * One document's changes.
 *
 * Everything inside is optional, so one tile, one dropdown choice or one field
 * can be saved on its own.
 */
const DocumentPatch = z.object({
  /** The dropdown, for documents that have one. */
  type: z.string().trim().min(1).optional(),
  /** Slot name to the URL of the already-uploaded file. */
  images: z.record(z.string()).optional(),
  /** Field name to its value: a licence number, an expiry. */
  fields: z.record(z.string()).optional(),
});

/** What the documents service applies: document id to its changes. */
export const DocumentPatchesDto = z.record(DocumentPatch);
export type PatchDocumentsInput = z.infer<typeof DocumentPatchesDto>;

/** The car's typed details. A number may arrive as a number or as text. */
export const VehicleDetailsDto = z.record(z.union([z.string(), z.number()]));
export type VehicleDetailsInput = z.infer<typeof VehicleDetailsDto>;

/**
 * The one upload call, for every document on every screen.
 *
 * Documents are keyed by their id from the session response, identity and
 * vehicle alike. The car's typed details — make, model, year, colour, plate —
 * travel under the reserved key `details`; no document may be named that.
 */
export const PatchDocumentsDto = z
  .object({ details: VehicleDetailsDto.optional() })
  .catchall(DocumentPatch);
