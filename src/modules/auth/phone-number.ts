import { AppError } from '../../common/errors/app.error.js';

/**
 * One definition of a phone number for the whole system.
 *
 * The screen keeps the country and the number in separate fields, so they
 * arrive separately and are joined here. Every stored and compared number is
 * E.164, so "07700 900341" and "+44 7700 900341" are the same driver.
 */
export function toE164(dialCode: string, nationalNumber: string, field = 'phoneNumber'): string {
  const digits = String(nationalNumber ?? '').replace(/\D/g, '');
  // A national number written with its trunk prefix — 07700… — loses the zero.
  const withoutTrunkPrefix = digits.replace(/^0+/, '');

  if (withoutTrunkPrefix.length < 6 || withoutTrunkPrefix.length > 14) {
    throw AppError.validation({ [field]: 'INVALID_PHONE' });
  }

  return `${dialCode}${withoutTrunkPrefix}`;
}
