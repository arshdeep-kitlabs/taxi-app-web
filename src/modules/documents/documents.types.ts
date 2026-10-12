export type ImageState = 'uploaded' | 'missing';

export type DocumentState = {
  name: string;
  /** The dropdown choice, or null when none has been made. */
  type: string | null;
  /** One entry per slot the chosen type defines. */
  images: Record<string, ImageState>;
  /** One entry per field, null until filled in. */
  fields: Record<string, string | null>;
  complete: boolean;
};

/**
 * Everything the identity screen renders.
 *
 * The counts drive "4 of 7 images"; canContinue drives the button. The app
 * displays these rather than working them out, so the rule lives in one place.
 */
export type DocumentsState = {
  documents: DocumentState[];
  imagesUploaded: number;
  imagesRequired: number;
  canContinue: boolean;
};
