/** Date helpers for the mock data. All dates are local time, as the source exports are. */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** `M/D/YYYY` (VNV exports), optionally followed by a time we ignore → local midnight. */
export function parseUsDate(value: string): number {
  const [m, d, y] = value.trim().split(' ')[0].split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** `MM-DD-YYYY hh:mm AM` (ILL scans) → local timestamp. */
export function parseIllDateTime(value: string): number {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Unrecognised ILL date: ${value}`);
  const [, mm, dd, yyyy, hh, min, ampm] = match;
  let hours = Number(hh) % 12;
  if (ampm.toUpperCase() === 'PM') hours += 12;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hours, Number(min)).getTime();
}

/** Local midnight of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `ts` moved by whole calendar days (DST-safe, unlike `± n * DAY_MS`). */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Calendar-day steps from `start` to `end` inclusive (DST-safe). */
export function eachDay(start: number, end: number): number[] {
  const days: number[] = [];
  const d = new Date(startOfDay(start));
  while (d.getTime() <= end) {
    days.push(d.getTime());
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** `MM/DD/YYYY`, as the designs show dates. */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/** `MM/DD/YYYY h:mm AM`, as the designs show date-times. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  return `${formatDate(ts)} ${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The last millisecond of the day containing `ts` (DST-safe). */
export function endOfDay(ts: number): number {
  return addDays(startOfDay(ts), 1) - 1;
}
