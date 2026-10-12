import type { ApplicationStatus, Rejection } from '../../domain/driver.js';

/** One image on the review list: what it is, whether it is in, and where to look. */
export type ReviewImage = {
  name: string;
  label: string;
  isMandatory: 0 | 1;
  isUploaded: 0 | 1;
  /** null until it is uploaded. The eye button opens this. */
  url: string | null;
};

/** One typed value already given, such as a licence number. */
export type ReviewValue = {
  name: string;
  label: string;
  value: string | null;
};

/**
 * One block on the review screen.
 *
 * Flat on purpose: this screen only displays and corrects. The choices, the
 * placeholders and the helper text that the upload screens need are left out,
 * so the app renders a row per value and a row per image and nothing else.
 */
export type ReviewDocument = {
  name: string;
  label: string;
  isMandatory: 0 | 1;
  /** The chosen ID type, shown as its label: "Passport". */
  selectedChoice: string | null;
  selectedChoiceLabel: string | null;
  values: ReviewValue[];
  images: ReviewImage[];
  /** 1 when a reviewer asked for this document again. */
  isRejected: 0 | 1;
  isComplete: 0 | 1;
};

export type ReviewPersonalInformation = {
  name: string | null;
  dateOfBirth: string | null;
  mobile: string;
  email: string | null;
};

export type SubmitResult = {
  status: 'submitted';
  /** Quoted to support, and shown at the top of the tracking screen. */
  reference: string;
  submittedAt: string;
};

/**
 * The verification screen.
 *
 * Only what that screen shows: where the application stands, when it moved,
 * and which documents were sent back. Every line of copy on it belongs to the
 * app — a timestamp travels, not "started 2 hours ago".
 */
export type TrackResult = {
  reference: string | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  /** When a reviewer last acted. The app words the "2 hours ago" line from it. */
  reviewedAt: string | null;
  /**
   * The reviewer's note and the images to redo, or null in every other state.
   *
   * This is the whole of what the "Action needed" screen cannot write for
   * itself. The headings, the status pill, the "Re-upload" buttons and the
   * count above the list are all the app's own copy, worded from `status` and
   * from `documents.length`. What travels is only what a person typed about
   * this case, plus the ids that say which document each note belongs to.
   */
  rejection: Rejection | null;
};

export type ReviewResult = {
  personalInformation: ReviewPersonalInformation;
  /**
   * The car's typed details as the driver entered them on the vehicle screen,
   * shown as they will read: a chosen option comes back as its label.
   */
  vehicle: ReviewValue[];
  identityDocuments: ReviewDocument[];
  vehicleDocuments: ReviewDocument[];
  /** Mandatory images still missing — what the Submit button waits on. */
  missingImages: number;
  /** Mandatory typed values still missing. */
  missingValues: number;
  /** 1 once nothing is missing. The declaration tick is the app's own gate. */
  canSubmit: 0 | 1;
  /**
   * draft until the driver sends it. submitted and approved freeze every
   * document; rejected opens them again so the driver can fix and resend.
   */
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
};
