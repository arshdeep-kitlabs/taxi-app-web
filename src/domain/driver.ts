export type DriverId = string;

/**
 * A driver account. Created the first time someone proves a phone number;
 * everything the onboarding collects hangs off this.
 */
export type Driver = {
  id: DriverId;
  /** Sequential, and what the admin panel shows as DR-0001. */
  number: number;
  /** E.164, e.g. +447700900341. The one identity every sign-in method resolves to. */
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /** YYYY-MM-DD. */
  dateOfBirth: string | null;
  /** When the Terms of Service checkbox was ticked. Null for seeded records. */
  acceptedTermsAt: string | null;
  /** Whether the driver agreed to receive promotions, offers and product news. */
  receivePromotions: boolean;
  createdAt: string;
  /**
   * Where the application stands. Documents are frozen while it is with a
   * reviewer and once it is approved; a rejection hands it back so the driver
   * can replace what was wrong and send it again.
   */
  applicationStatus: ApplicationStatus;
  /**
   * What the driver quotes to support: KT-4821-GB. Issued on the first
   * submission and kept for the life of the application, so a resubmission
   * after a rejection is still the same case.
   */
  reference: string | null;
  submittedAt: string | null;
  /** When a reviewer last decided. Null until then. */
  reviewedAt: string | null;
  /**
   * The documents a reviewer asked for again, by name. The app marks those
   * tiles rather than making the driver guess which one was the problem.
   */
  rejectedDocuments: string[];
  /**
   * The reviewer's own words, when they sent the application back.
   *
   * Everything here was typed by a person about this one case, so none of it
   * can be app copy the way the rest of the screen is.
   *
   * Set by both refusals. A send-back names the documents to redo; an
   * outright rejection carries the reason with an empty list, because there
   * is nothing to redo. Null once approved, and null before any decision.
   */
  rejection: Rejection | null;

  /**
   * What the admin directory lists beside the account. Empty until there is a
   * rides system to fill it — the columns exist so the screen is whole.
   */
  city: string | null;
  rating: number | null;
  totalRides: number;
  earnings: number;
  /**
   * Whether the account may operate at all. A separate question from where
   * their application stands: an approved driver can still be suspended.
   */
  accountStatus: AccountStatus;

  /**
   * The driver's own gender, as a reviewer recorded it from their identity
   * document. Null until someone has checked one.
   *
   * It is not asked for at sign-up on purpose: the gender-specific mode below
   * decides who shares a car with whom, so a self-declared answer is not
   * enough to hang it on.
   */
  gender: Gender | null;
  /** When a reviewer confirmed the gender above. Null means unverified. */
  genderVerifiedAt: string | null;
  /**
   * Whether this driver has asked to be matched by passenger gender.
   *
   * Stored separately from the preference beside it, so turning the mode off
   * and on again does not make the driver choose again.
   *
   * This is what the driver asked for, which is not always what is happening:
   * the mode is only honoured while the feature is switched on for everyone.
   */
  genderSpecificModeEnabled: boolean;
  /** Which passengers they want while the mode above is on. */
  passengerGenderPreference: PassengerGenderPreference;
};

/** A person's gender, as recorded from a document rather than asked for. */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

/**
 * Who a driver is willing to carry while gender-specific mode is on.
 *
 * `ANY` is the default and means the mode changes nothing for them, which is
 * why it is the value a driver starts with rather than a null.
 */
export type PassengerGenderPreference = 'ANY' | 'FEMALE' | 'MALE';

/** One document a reviewer sent back, and why. */
export type RejectedDocument = {
  /**
   * The document's id, exactly as `GET /session` gives it and as a
   * `PATCH /documents` body keys it: "driverGovernmentId". The app already
   * holds the label for it, so only the id travels.
   */
  id: string;
  /**
   * Which photograph, when only one of them was the problem: "front", "back",
   * "left", "right". Null sends the whole document back.
   */
  image: string | null;
  /**
   * Why it was refused, in the reviewer's words: "The lower edge is cut off,
   * so the licence categories cannot be read."
   */
  reason: string;
};

/**
 * A reviewer's decision to send an application back.
 *
 * The labels the screen shows — "Driving licence · back image" — are not here:
 * the app already holds those in its config, and building them on the server
 * would mean a deploy to change a word. Only what a person wrote travels.
 */
export type Rejection = {
  /** Who reviewed it: "Priya Raman". The app draws the initials from it. */
  reviewer: string;
  /** The team they answer for: "Compliance team". */
  team: string;
  /** The note above the list, explaining the decision as a whole. */
  message: string;
  /** Everything to redo. Never empty when a rejection exists. */
  documents: RejectedDocument[];
};

export type AccountStatus = 'active' | 'suspended' | 'blocked';

/**
 * Where an application stands, in the order it moves.
 *
 *   draft              still being filled in on the phone
 *   submitted          sent, waiting for someone to pick it up
 *   in_review          a reviewer has it open
 *   changes_requested  handed back for the driver to fix and send again
 *   approved           done, and closed
 *   rejected           refused, and closed
 *
 * The last two are both endings, which is why they are separate: a driver
 * whose licence photo was blurry needs a way back in, and one who is not
 * eligible does not.
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

/** The states a driver may still change their own documents in. */
export function isEditable(status: ApplicationStatus): boolean {
  return status === 'draft' || status === 'changes_requested';
}
