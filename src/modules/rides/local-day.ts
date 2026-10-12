/**
 * Which local day a moment belongs to, and where the weeks around it start.
 *
 * Every boundary on the earnings and history screens is a local one. A ride at
 * 00:30 London time belongs to that date, not to the UTC date before it, and a
 * week runs Monday to Sunday because that is what the chart draws.
 *
 * The timezone comes from config rather than the server's own clock, so a box
 * in another region reports the same days as the city it serves.
 */

/** "2026-09-24" for a moment, in the given zone. */
export function dayKey(moment: Date, timeZone: string): string {
  // en-CA gives YYYY-MM-DD, which sorts and subtracts without reformatting.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(moment);
}

/** 1 = Monday … 7 = Sunday, in the given zone. */
export function weekdayOf(dayKeyValue: string, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(
    new Date(`${dayKeyValue}T12:00:00Z`),
  );
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return order.indexOf(name) + 1;
}

/** The day key `days` before (negative) or after (positive) this one. */
export function shiftDay(dayKeyValue: string, days: number): string {
  // Midday avoids the hour a daylight-saving change would otherwise move.
  const at = new Date(`${dayKeyValue}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Every day key from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) out.push(day);
  return out;
}

/**
 * The instant a local day begins, as a UTC Date.
 *
 * Found by guessing UTC midnight and correcting by the zone's offset, which
 * holds either side of a daylight-saving change because the correction is
 * measured at the guess itself.
 */
export function startOfDay(dayKeyValue: string, timeZone: string): Date {
  const guess = new Date(`${dayKeyValue}T00:00:00Z`);
  const offsetMinutes = zoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

/** The instant the day after this one begins — an exclusive upper bound. */
export function endOfDay(dayKeyValue: string, timeZone: string): Date {
  return startOfDay(shiftDay(dayKeyValue, 1), timeZone);
}

/** How far ahead of UTC the zone is at that moment, in minutes. */
function zoneOffsetMinutes(moment: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(moment);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  );
  return (asUtc - moment.getTime()) / 60_000;
}
