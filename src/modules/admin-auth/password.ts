import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Password hashing, on the standard library alone.
 *
 * scrypt rather than bcrypt or argon2 because it ships with Node: no native
 * build, no extra dependency, and it is deliberately slow and memory-hard in
 * the way a password hash has to be. The cost parameters below are Node's
 * defaults, which are the current OWASP floor.
 *
 * The stored form carries its own salt and parameters, so a later change to
 * either can be rolled out without invalidating existing rows — read the
 * algorithm out of the stored string rather than assuming it.
 */
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** `scrypt$<salt hex>$<derived key hex>` */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(plain, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Whether a password matches what was stored.
 *
 * Compared with `timingSafeEqual`, so the time this takes says nothing about
 * how much of the hash was right.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const derived = await scryptAsync(plain, Buffer.from(saltHex, 'hex'), expected.length);

  // Lengths must match before the comparison, or timingSafeEqual throws.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
