import { z } from 'zod';

/**
 * Every environment variable the app reads, validated once at boot.
 *
 * A missing or malformed value stops the process immediately with a readable
 * message, rather than surfacing as a strange failure on some later request.
 */
const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),

  /** Signs the auth and refresh tokens. Must be a real secret in production. */
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),

  AUTH_TOKEN_MINUTES: z.coerce.number().int().positive().default(60),

  /** Where the editable configuration lives. A database replaces this later. */
  CONFIG_FILE: z.string().default('config/app-config.json'),

  /** The MySQL server the repositories run against. */
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().min(1),
  /** How many connections the pool may hold open at once. */
  MYSQL_POOL_SIZE: z.coerce.number().int().positive().max(100).default(10),

  EXPOSE_OTP_CODE: booleanFromString,
  ALLOW_TEST_ACCOUNTS: booleanFromString,
});

type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment is not usable:\n${problems}`);
  }

  return parsed.data;
}

export const env: Env = loadEnv();
