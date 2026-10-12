import { AppError } from '../../common/errors/app.error.js';
import type { Country } from '../app-config/app-config.types.js';

/**
 * The country control sends its two halves separately: the ISO code in
 * `countryCode`, the dialling prefix in `phoneCode`.
 *
 * The picker belongs to the app, so what it offers is the app's business.
 * Both halves are still checked for *shape* — two letters, and a plus with up
 * to four digits — because a malformed prefix builds a number nobody can ring.
 * Neither is checked against a list any more: a country the configuration has
 * not heard of is taken as sent rather than refused.
 */
const ISO = /^[A-Za-z]{2}$/;
const DIAL = /^\+\d{1,4}$/;

export function resolveCountry(
  countryCode: string,
  phoneCode: string,
  countries: Country[],
): Country {
  const iso = String(countryCode ?? '').trim();
  const dial = String(phoneCode ?? '').trim();

  if (!ISO.test(iso)) {
    throw AppError.validation({ countryCode: 'INVALID_COUNTRY_CODE' });
  }
  if (!DIAL.test(dial)) {
    throw AppError.validation({ phoneCode: 'INVALID_PHONE_CODE' });
  }

  // Configuration still names the countries, and anything listed keeps its
  // name — the admin panel and the driver directory read it. An unlisted one
  // is accepted on the app's word, carrying the prefix it sent.
  const known = countries.find((candidate) => candidate.code === iso.toUpperCase());

  return known && known.dialCode === dial
    ? known
    : {
        code: iso.toUpperCase(),
        name: known?.name ?? iso.toUpperCase(),
        dialCode: dial,
        // Only the picker's opening choice, which an unlisted country is not.
        isDefault: false,
      };
}
