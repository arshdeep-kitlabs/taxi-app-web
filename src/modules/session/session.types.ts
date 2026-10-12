/** Everything the app knows about the signed-in driver. */
export type SessionDriver = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
  dateOfBirth: string | null;
  receivePromotions: boolean;
  createdAt: string;
};

/**
 * What the driver may do, as numeric flags.
 *
 * The app reads these instead of deciding for itself, so access can change
 * without an app release.
 */
export type SessionAccess = {
  canUploadDocuments: 0 | 1;
  canAddVehicle: 0 | 1;
  /** 1 once every mandatory document is in and the application may be sent. */
  canSubmitApplication: 0 | 1;
};

/** Which photographs a card asks for. */
export type ImageRequirements = {
  frontImageRequired: boolean;
  backImageRequired: boolean;
  /** Only the profile photo asks for these, so they appear only where they do. */
  leftImageRequired?: boolean;
  rightImageRequired?: boolean;
};

/** One option in a document's dropdown, with the photos that option needs. */
export type DocumentChoice = ImageRequirements & {
  id: string;
  name: string;
  info: string;
};

/**
 * One document the driver has to provide.
 *
 * It describes itself — what it is, what it is for, which photographs it needs
 * — so the app renders a card it has never seen before, and a new document
 * arrives without an app release.
 */
export type RequiredDocument = ImageRequirements & {
  /** Stable. The same string keys this document in a PATCH body. */
  id: string;
  name: string;
  info: string;
  isMandatory: boolean;
  /** Empty when there is nothing to choose. */
  documentChoices: DocumentChoice[];
};

/** The two screens that collect documents, each a plain list. */
export type SessionDocuments = {
  identityDocuments: RequiredDocument[];
  vehicleDocuments: RequiredDocument[];
};

export type SessionResult = {
  accessToken: string;
  refreshToken: string;
  driver: SessionDriver;
  access: SessionAccess;
  documents: SessionDocuments;
};
