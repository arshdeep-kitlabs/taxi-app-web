import { AppError } from '../../common/errors/app.error.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole years between a date of birth and a given day. */
function ageOn(dateOfBirth: string, today: Date): number {
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  let age = today.getUTCFullYear() - born.getUTCFullYear();

  const monthsApart = today.getUTCMonth() - born.getUTCMonth();
  const beforeBirthdayThisYear =
    monthsApart < 0 || (monthsApart === 0 && today.getUTCDate() < born.getUTCDate());
  if (beforeBirthdayThisYear) age -= 1;

  return age;
}

/**
 * Checks the date is real and the driver is old enough, reporting against the
 * date-of-birth field so the form highlights the right control.
 */
export function assertOldEnough(dateOfBirth: string, minimumAge: number, now: Date): void {
  if (!ISO_DATE.test(dateOfBirth) || Number.isNaN(Date.parse(`${dateOfBirth}T00:00:00Z`))) {
    throw AppError.validation({ dateOfBirth: 'INVALID_DATE' });
  }
  if (new Date(`${dateOfBirth}T00:00:00Z`) > now) {
    throw AppError.validation({ dateOfBirth: 'INVALID_DATE' });
  }
  if (ageOn(dateOfBirth, now) < minimumAge) {
    // The threshold travels with the code so the app can word it precisely.
    throw AppError.validation({ dateOfBirth: 'UNDER_MINIMUM_AGE' }, { minimumAge });
  }
}
