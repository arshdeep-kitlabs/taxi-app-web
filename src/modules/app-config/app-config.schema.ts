import { z } from 'zod';
import type { AppConfig } from './app-config.types.js';

/**
 * The rules any configuration must satisfy, wherever it came from.
 *
 * This is the piece that makes admin editing safe. A file, a database row or a
 * form submission all pass through here, so a saved configuration can never
 * leave the app in a state it cannot render — a document with no way to upload
 * anything, or two countries both claiming to be the default.
 *
 * Use it on the way in, before anything is stored, so a bad edit is refused
 * rather than discovered by every driver at once.
 */

const hexColour = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex colour, e.g. #6E9179');

/** Ids end up stored against driver records, so they must be stable and safe. */
const identifier = z
  .string()
  // camelCase, like every key in the API: these ids key the bodies the app sends.
  .regex(/^[a-z][a-zA-Z0-9]*$/, 'Use camelCase: letters and digits, starting lower-case');

const url = z.string().url().or(z.literal(''));

const imageSlot = z.object({
  name: identifier,
  label: z.string().min(1),
  description: z.string().min(1, 'Say what to photograph'),
});

const fieldOption = z.object({ id: identifier, label: z.string().min(1) });

const documentField = z
  .object({
    name: identifier,
    label: z.string().min(1),
    type: z.enum(['text', 'number', 'month', 'select']),
    placeholder: z.string(),
    options: z.array(fieldOption).optional(),
    helper: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    isMandatory: z.boolean(),
  })
  .superRefine((field, ctx) => {
    // A dropdown with nothing in it is a control the driver cannot satisfy.
    if (field.type === 'select' && !field.options?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${field.name}" is a select with no options`,
      });
    }
    // A pattern that will not compile would reject every value at runtime.
    if (field.pattern !== undefined) {
      try {
        new RegExp(field.pattern);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${field.name}" has a pattern that is not a valid expression`,
        });
      }
    }
  });

const typeOption = z.object({
  id: identifier,
  label: z.string().min(1),
  description: z.string().min(1, 'Say how to photograph this one'),
  // Every choice must be uploadable, or a driver can select it and get stuck.
  images: z.array(imageSlot).min(1, 'A type needs at least one image slot'),
});

const documentSpec = z
  .object({
    name: identifier,
    label: z.string().min(1),
    description: z.string().min(1, 'Say what this document is for'),
    isMandatory: z.boolean(),
    collectedAt: z.enum(['identity', 'vehicle']),
    typeOptions: z.array(typeOption),
    images: z.array(imageSlot),
    fields: z.array(documentField),
  })
  .superRefine((document, ctx) => {
    if (document.typeOptions.length === 0 && document.images.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${document.name}" has no image slots and no types to choose`,
      });
    }
    assertUnique(document.typeOptions.map((option) => option.id), ctx, `"${document.name}" type ids`);
    assertUnique(document.fields.map((field) => field.name), ctx, `"${document.name}" field names`);
  });

const country = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
  dialCode: z.string().regex(/^\+\d{1,4}$/, 'Use a dial code like +44'),
  isDefault: z.boolean(),
});

const legalDocument = z.object({ url });

function assertUnique(values: string[], ctx: z.RefinementCtx, what: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${what} must be unique: "${value}"` });
    }
    seen.add(value);
  }
}

const AppConfigSchema = z
  .object({
    branding: z.object({
      appName: z.string().min(1),
      logoUrl: url,
    }),

    theme: z.object({
      colors: z.object({
        pageBackground: hexColour,
        text: hexColour,
        accent: hexColour,
      }),
    }),

    signIn: z.object({
      countries: z.array(country).min(1, 'List at least one country'),
    }),

    legal: z.object({
      terms: legalDocument,
      privacy: legalDocument,
    }),

    application: z.object({
      referencePrefix: z.string().min(1).max(4),
      referenceDigits: z.number().int().min(4).max(8),
      /**
       * The team a driver sees a rejection as coming from, beside the
       * reviewer's own name. Here rather than derived from the reviewer's
       * admin role, because "Operations" is what the business calls them
       * internally and not what a driver should be told.
       */
      reviewTeam: z.string().min(1).default('Compliance team'),
      /** How soon a document counts as expiring on the profile screen. */
      documentExpiryWarningDays: z.number().int().positive().default(60),
    }),

    /** How money reads. The app formats; the server only says which currency. */
    money: z.object({
      currency: z.string().length(3),
      symbol: z.string().min(1).max(3),
    }),

    /**
     * Which day a ride belongs to, and where a week starts, are local
     * questions — a ride at 00:30 belongs to the night before in London and
     * to a different date in UTC. Every day boundary is computed here.
     */
    timezone: z.string().min(1),

    rides: z.object({
      /** The classes a ride can be sold as. Shown on the receipt. */
      serviceClasses: z.array(z.string().min(1)).min(1),
    }),

    documents: z.object({
      documents: z.array(documentSpec).min(1),
      vehicleDetails: z.object({ fields: z.array(documentField).min(1) }),
    }),

    otp: z.object({
      codeLength: z.number().int().min(4).max(8),
      expiresInMinutes: z.number().int().positive(),
      resendAfterSeconds: z.number().int().positive(),
    }),

    rules: z.object({ minimumAgeYears: z.number().int().min(16).max(99) }),

    support: z.object({ email: z.string().email(), phone: z.string().min(1) }),

    features: z.object({
      phoneSignIn: z.boolean(),
      emailSignIn: z.boolean(),
      socialSignIn: z.boolean(),
      /**
       * Gender-specific riding, switched on and off centrally.
       *
       * Turning it off does not erase what drivers chose — it stops the
       * choice having any effect, and stops new ones being made.
       */
      genderPreference: z.boolean(),
    }),

    minimumAppVersion: z.string().min(1),
  })
  .superRefine((config, ctx) => {
    // The picker has to open on exactly one country.
    const defaults = config.signIn.countries.filter((entry) => entry.isDefault);
    if (defaults.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signIn', 'countries'],
        message: `Exactly one country must be the default, found ${defaults.length}`,
      });
    }

    assertUnique(config.signIn.countries.map((entry) => entry.code), ctx, 'Country codes');
    assertUnique(config.documents.documents.map((entry) => entry.name), ctx, 'Document names');

    // The vehicle screen sends the car's typed values under "details", beside
    // the documents, so no document may claim that name.
    if (config.documents.documents.some((entry) => entry.name === 'details')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"details" is reserved and cannot be used as a document name',
      });
    }

  });

/** One rejected value, keyed the way the admin form keys its controls. */
export type ConfigIssue = { path: string; message: string };

export class ConfigInvalidError extends Error {
  constructor(
    readonly problems: string[],
    /** The same list, split up, so a form can mark the control that is wrong. */
    readonly issues: ConfigIssue[] = [],
  ) {
    super(`Configuration is not usable:\n${problems.map((line) => `  ${line}`).join('\n')}`);
    this.name = 'ConfigInvalidError';
  }
}

/**
 * Validates raw configuration, reporting every problem at once rather than the
 * first — an admin fixing a form wants the whole list.
 */
export function parseAppConfig(raw: unknown): AppConfig {
  const result = AppConfigSchema.safeParse(raw);
  if (result.success) return result.data as AppConfig;

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

  throw new ConfigInvalidError(
    issues.map((issue) => `${issue.path}: ${issue.message}`),
    issues,
  );
}
