/**
 * The configuration an admin edits.
 *
 * Every value here is read by the API. A value nothing reads is a setting an
 * admin can change to no effect, so it does not belong here.
 */

export type BrandingConfig = {
  appName: string;
  /** Empty until published — the app falls back to its bundled logo. */
  logoUrl: string;
};

type ThemeColors = {
  /** Behind everything. */
  pageBackground: string;
  /** Text and icons drawn on that background. */
  text: string;
  /** The brand colour: buttons, highlights, the tick on an uploaded tile. */
  accent: string;
};

export type ThemeConfig = {
  colors: ThemeColors;
};

export type Country = {
  code: string;
  name: string;
  /** Including the plus: "+44". */
  dialCode: string;
  /** The one the picker opens on. Exactly one country has this. */
  isDefault: boolean;
};

export type SignInConfig = {
  countries: Country[];
};

type LegalDocument = {
  /** Empty until the page is published. */
  url: string;
};

export type LegalConfig = {
  terms: LegalDocument;
  privacy: LegalDocument;
};

/** One upload tile: front, back, left, right. */
export type DocumentImageSlot = {
  name: string;
  label: string;
  /** What to photograph, so the driver knows before opening the camera. */
  description: string;
};

/**
 * One choice in a document's dropdown.
 *
 * Each type carries its own tiles, because they genuinely differ: an Aadhaar
 * card has two sides, a birth certificate has one.
 */
export type DocumentTypeOption = {
  id: string;
  label: string;
  /** How to photograph this particular ID — they differ enough to matter. */
  description: string;
  images: DocumentImageSlot[];
};

export type DocumentFieldType = 'text' | 'number' | 'month' | 'select';

/** A choice in a field that offers a fixed list. */
export type FieldOption = { id: string; label: string };

/** A typed input: a licence number, an expiry, a make, a number plate. */
export type DocumentField = {
  name: string;
  label: string;
  type: DocumentFieldType;
  /** Shown in the box before anything is typed. */
  placeholder: string;
  /** Only for `select`. The app sends an id, never the label. */
  options?: FieldOption[];
  /** A note beside the box, such as the country a plate belongs to. */
  helper?: string;
  /** Bounds for a number, such as the oldest vehicle year accepted. */
  min?: number;
  max?: number;
  /** A regular expression the value must match, for things like a plate. */
  pattern?: string;
  /** Whether the driver may leave it blank. */
  isMandatory: boolean;
};

/** One document the driver provides, and everything the app needs to ask for it. */
export type DocumentSpec = {
  /** The camelCase id: what the session returns and what a PATCH body is keyed by. */
  name: string;
  label: string;
  /** What this document is for, shown under its heading. */
  description: string;
  /** Whether it blocks submitting. Optional documents still appear, marked as such. */
  isMandatory: boolean;
  /** Which screen collects it, so the session call can group them. */
  collectedAt: 'identity' | 'vehicle';
  /** Empty when the document has no dropdown. */
  typeOptions: DocumentTypeOption[];
  /** The tiles, for a document with no dropdown. Ignored when typeOptions has entries. */
  images: DocumentImageSlot[];
  fields: DocumentField[];
};

export type DocumentsConfig = {
  documents: DocumentSpec[];
  /**
   * The car's typed details. The app draws and holds this form itself; these
   * definitions are what a submission is checked against, and where the review
   * screen reads its labels from.
   */
  vehicleDetails: { fields: DocumentField[] };
};

/** How an application reference reads: KT-4821-GB. */
export type ApplicationConfig = {
  referencePrefix: string;
  referenceDigits: number;
  /** The team a driver sees a rejection as coming from. */
  reviewTeam: string;
  /** How soon a document counts as expiring on the profile screen. */
  documentExpiryWarningDays: number;
};

export type OtpConfig = {
  /** How many boxes the verification screen draws. */
  codeLength: number;
  expiresInMinutes: number;
  /** How long the resend button stays disabled. */
  resendAfterSeconds: number;
};

export type RulesConfig = {
  /** Enforced on the sign-up form. */
  minimumAgeYears: number;
};

export type SupportConfig = {
  email: string;
  phone: string;
};

export type FeatureFlags = {
  phoneSignIn: boolean;
  emailSignIn: boolean;
  socialSignIn: boolean;
  /** Gender-specific riding. Off means stored choices have no effect. */
  genderPreference: boolean;
};

export type MoneyConfig = {
  /** ISO 4217, e.g. GBP. */
  currency: string;
  /** What the app puts in front of an amount: £. */
  symbol: string;
};

export type RidesConfig = {
  serviceClasses: string[];
};

export type AppConfig = {
  branding: BrandingConfig;
  money: MoneyConfig;
  /** IANA name. Every day and week boundary is worked out in it. */
  timezone: string;
  rides: RidesConfig;
  theme: ThemeConfig;
  signIn: SignInConfig;
  legal: LegalConfig;
  application: ApplicationConfig;
  documents: DocumentsConfig;
  otp: OtpConfig;
  rules: RulesConfig;
  support: SupportConfig;
  features: FeatureFlags;
  /** Below this the app should prompt the driver to update. */
  minimumAppVersion: string;
};

/**
 * What GET /config returns: only what every screen needs before it paints. The
 * rest reaches the app through the endpoint that uses it.
 */
export type AppConfigResponse = {
  branding: {
    appName: string;
    logoUrl: string;
  };
  theme: {
    backgroundColor: string;
    foregroundColor: string;
    themeColor: string;
  };
  legal: {
    termOfServiceUrls: string;
    privacyPolicyUrls: string;
  };
  /** Needed before any screen can render an amount. */
  money: MoneyConfig;
  support: SupportConfig;
  features: FeatureFlags;
  minimumAppVersion: string;
};
