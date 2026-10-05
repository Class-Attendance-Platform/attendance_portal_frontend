// Calendar dates as `YYYY-MM-DD` strings (the API's format), in Asia/Dhaka time.
// Bangladesh has no daylight saving time: Dhaka is always UTC+6, so the maths is exact.

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateParts = { year: number; month: number; day: number }; // month 1–12

const pad = (value: number) => String(value).padStart(2, '0');

export function toISODate({ year, month, day }: DateParts): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Parses `YYYY-MM-DD` (or the date part of an ISO date-time). Null if invalid. */
export function parseISODate(value: string | null | undefined): DateParts | null {
  const match = ISO_DATE.exec((value ?? '').slice(0, 10));
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    return null;
  }
  return parts;
}

/** A moment shifted to Dhaka wall-clock time; read it with the getUTC* methods. */
export function dhakaClock(moment: Date | string | number = Date.now()): Date {
  const time = moment instanceof Date ? moment.getTime() : typeof moment === 'number' ? moment : Date.parse(moment);
  return new Date(time + DHAKA_OFFSET_MS);
}

/** Today's date in Dhaka, `YYYY-MM-DD`. */
export function todayISO(): string {
  const now = dhakaClock();
  return toISODate({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday({ year, month, day }: DateParts): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(value: string, days: number): string {
  const parts = parseISODate(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return toISODate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

/** Moves a {year, month} by whole months. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** ISO strings compare correctly as text. */
export const compareISODate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const isFutureDate = (value: string) => compareISODate(value.slice(0, 10), todayISO()) > 0;

/**
 * The weeks of a month for a calendar grid, Sunday first. Days outside the month are null.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = weekday({ year, month, day: 1 });
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = Array.from({ length: first }, () => null);
  for (let day = 1; day <= total; day += 1) cells.push(toISODate({ year, month, day }));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
