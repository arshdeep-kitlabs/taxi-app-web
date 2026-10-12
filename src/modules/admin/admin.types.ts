import type { AccountStatus, ApplicationStatus, Gender, Rejection } from '../../domain/driver.js';

/** One row of the Directory tab. */
export type DirectoryRow = {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  phone: string;
  city: string | null;
  rating: number | null;
  totalRides: number;
  earnings: number;
  joinedAt: string;
  status: AccountStatus;
};

/** One row of the Applications tab. */
export type ApplicationRow = {
  driverId: string;
  driverName: string | null;
  applicationId: string | null;
  submittedAt: string | null;
  documentsUploaded: number;
  documentsRequired: number;
  status: ApplicationStatus;
  rejectedDocuments: string[];
};

/** Full driver profile returned by GET /admin/drivers/:driverId. */
export type DriverProfile = {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  phone: string;
  dateOfBirth: string | null;
  city: string | null;
  rating: number | null;
  totalRides: number;
  /** Placeholder — will be populated once a rides table exists. */
  completedRides: number;
  /** Placeholder — will be populated once a rides table exists. */
  cancelledRides: number;
  earnings: number;
  joinedAt: string;
  status: AccountStatus;
  /**
   * The gender a reviewer recorded from this driver's identity document, and
   * when. Null means no one has, and the driver cannot use gender-specific
   * riding until someone does.
   */
  gender: Gender | null;
  genderVerifiedAt: string | null;
  vehicle: VehicleSnapshot | null;
  /** The car's typed details with their labels, in the order the form asks. */
  vehicleDetails: { name: string; label: string; value: string | null }[];
  /**
   * Every document this driver has to provide, uploaded or not, with the
   * images and typed values behind each one.
   */
  documents: AdminDocument[];
  /** Where the onboarding application stands, and what a reviewer last said. */
  application: {
    status: ApplicationStatus;
    /** What the driver quotes to support: KT-4821-GB. */
    reference: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    /** The note and documents from the last send-back, or null. */
    rejection: Rejection | null;
  };
  /**
   * Ride history rows. Empty array until a rides table exists.
   * Shape is already defined so the frontend can render the column headers
   * without any code change when rides are added.
   */
  rides: RideRow[];
};

/**
 * One document on the admin's screen, with everything it needs to render it.
 *
 * Unlike the driver app, the panel never reads config — it only ever talks to
 * /admin. So the labels travel here rather than being looked up, and a new
 * document type appears on the admin screens without an admin release.
 */
export type AdminDocument = {
  /** The document id: what a PATCH /documents body is keyed by, and what a rejection names. */
  id: string;
  /** "Government ID". */
  label: string;
  isMandatory: boolean;
  /** The dropdown choice, and how it reads: "passport" / "Passport". */
  type: string | null;
  typeLabel: string | null;
  /** Keyed by slot — front, back, left, right — for what has been uploaded. */
  images: Record<string, UploadedImage>;
  /** The slots this document is asking for, given the type chosen. */
  expectedImages: { name: string; label: string; isUploaded: 0 | 1 }[];
  /** The typed boxes beside the photos, with the values given. */
  fields: { name: string; label: string; value: string | null }[];
  /** 1 when an admin sent this document back and the driver has to redo it. */
  isRejected: 0 | 1;
  /** Why it was sent back, in the admin's words. Null unless isRejected. */
  rejectionReason: string | null;
  /** 1 once every slot this document asks for is in. */
  isComplete: 0 | 1;
};

export type UploadedImage = { url: string; uploadedAt: string };

/** The car details as stored in driver_vehicles. */
export type VehicleSnapshot = Record<string, string | null>;

/**
 * One ride row. Fields are nullable so partial data can be returned
 * as the rides system is built out incrementally.
 */
export type RideRow = {
  id: string;
  customerName: string | null;
  from: string | null;
  to: string | null;
  fare: number | null;
  status: string | null;
  date: string | null;
};

/** Full application detail returned by GET /admin/applications/:driverId. */
export type ApplicationDetail = {
  driverId: string;
  driverName: string | null;
  applicationId: string | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  driver: {
    phone: string;
    email: string | null;
    dateOfBirth: string | null;
    /** Where they drive, when it is known. Shown beside the name. */
    city: string | null;
  };
  vehicle: VehicleSnapshot | null;
  /** The note from the last send-back, or null. */
  rejection: Rejection | null;
  /** Every document, with the images and values the driver actually sent. */
  documents: AdminDocument[];
};

/** What PATCH /admin/applications/:driverId accepts. */
export type ApplicationAction =
  | { action: 'approve_application' }
  | {
      action: 'reject_application';
      reason: string;
      /**
       * Which documents the refusal was about, if any. Optional: an
       * application can be refused on grounds that belong to no one document.
       * The driver cannot redo them — a rejection is final — but they are told
       * what was wrong rather than left with a bare sentence.
       */
      documents?: { id: string; image?: string; reason: string }[];
    }
  | {
      action: 'request_changes';
      /** The note above the list, explaining the decision as a whole. */
      message: string;
      /**
       * Every document to send back, each with its own reason. Never empty.
       *
       * `id` is the document's id from the session response — the same string
       * a `PATCH /documents` body is keyed by. `image` narrows it to one
       * photograph and may be left out to send the whole document back.
       */
      documents: { id: string; image?: string; reason: string }[];
    }
  | { action: 'approve_document'; document: string }
  | { action: 'reject_document'; document: string; reviewNote: string };

export type Listing<T> = {
  rows: T[];
  total: number;
};
