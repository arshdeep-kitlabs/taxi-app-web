/**
 * What a driver has uploaded so far.
 *
 * A document is a card on the identity screen: a dropdown choice, some image
 * slots, and sometimes typed fields. Which slots and fields exist comes from
 * config, so this stays the same shape as the checklist grows.
 */
export type UploadedImage = {
  url: string;
  uploadedAt: string;
};

export type DriverDocument = {
  /** Matches a name in the config document list. */
  name: string;
  /** The dropdown choice, when the document has one. */
  type: string | null;
  /** Keyed by slot name: front, back, left, right. */
  images: Record<string, UploadedImage>;
  /** Keyed by field name: licenceNumber, expiry. */
  fields: Record<string, string>;
};

export type DriverDocuments = {
  driverId: string;
  documents: Record<string, DriverDocument>;
  updatedAt: string;
};
