import { dhakaClock, parseISODate } from './dates';
import type { Role } from './api/types';

// Formatting for people. Dates "05 Oct 2026", times "10:05 AM" (Asia/Dhaka),
// percentages "86%", "Level 3 · Term I", names. Missing values show as "—".

export const EMPTY = '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (value: number) => String(value).padStart(2, '0');

/** Date parts of a `YYYY-MM-DD` date, or of a date-time in Dhaka time. */
function dateParts(value: string | Date): { year: number; month: number; day: number } | null {
  if (typeof value === 'string' && value.length === 10) return parseISODate(value);
  const clock = dhakaClock(value);
  if (Number.isNaN(clock.getTime())) return null;
  return { year: clock.getUTCFullYear(), month: clock.getUTCMonth() + 1, day: clock.getUTCDate() };
}

/** "05 Oct 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const parts = dateParts(value);
  return parts ? `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}` : EMPTY;
}

/** "Mon, 05 Oct 2026" */
export function formatDateWithWeekday(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const parts = dateParts(value);
  if (!parts) return EMPTY;
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return `${WEEKDAYS[day]}, ${formatDate(value)}`;
}

/** "October 2026" */
export function formatMonth(year: number, month: number): string {
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

export const weekdayShort = (index: number) => WEEKDAYS[index];

/** "10:05 AM" in Dhaka time. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const clock = dhakaClock(value);
  if (Number.isNaN(clock.getTime())) return EMPTY;
  const hours = clock.getUTCHours();
  return `${hours % 12 || 12}:${pad(clock.getUTCMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** "05 Oct 2026, 10:05 AM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const date = formatDate(value);
  return date === EMPTY ? EMPTY : `${date}, ${formatTime(value)}`;
}

/** Seconds as a countdown: "4:12", "0:05". */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

/** "86%" (rounded down: 74.5 is "74%", never the minimum). Null (no classes yet) shows "—". */
export { formatPercent } from './percent';

/** "1 class", "3 classes" */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "482 913": a 6-digit code in two groups, easier to read aloud. */
export function formatCode(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : code;
}

const LEVEL_NUMBERS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };

/** "Third" → 3. Numbers pass through. Null if unknown. */
export function levelNumber(level: string | number | null | undefined): number | null {
  if (level === null || level === undefined || level === '') return null;
  if (typeof level === 'number') return level;
  const asNumber = Number(level);
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;
  return LEVEL_NUMBERS[level.trim().toLowerCase()] ?? null;
}

/** "Level 3" */
export function levelLabel(level: string | number | null | undefined): string {
  const number = levelNumber(level);
  if (number) return `Level ${number}`;
  return level ? `Level ${level}` : EMPTY;
}

/** "Level 3 · Term I" */
export function levelTermLabel(level: string | number | null | undefined, term: string | null | undefined): string {
  if (!level && !term) return EMPTY;
  if (!term) return levelLabel(level);
  if (!level) return `Term ${term}`;
  return `${levelLabel(level)} · Term ${term}`;
}

type Named = {
  first_name?: string | null;
  last_name?: string | null;
  userName?: string | null;
  name?: string | null;
  email?: string | null;
};

/** "Ayesha Rahman", falling back to userName, name, then email. */
export function fullName(person: Named | null | undefined): string {
  if (!person) return EMPTY;
  const joined = [person.first_name, person.last_name].filter((part) => part && part.trim()).join(' ').trim();
  return joined || person.userName?.trim() || person.name?.trim() || person.email || EMPTY;
}

/** "Ayesha" (for greetings). */
export function firstName(person: Named | null | undefined): string {
  return person?.first_name?.trim() || fullName(person).split(' ')[0];
}

/** "AR" from "Ayesha Rahman"; one letter for one word; "?" when empty. */
export function initials(name: string | null | undefined): string {
  // Skip titles and punctuation ("Dr.", "(CSE)"); keep words that start with a letter or digit.
  const words = (name ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9À-￿]+/, ''))
    .filter((word) => word && !/^(dr|mr|mrs|ms|prof)\.?$/i.test(word));
  if (!words.length) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 1) : `${words[0][0]}${words[words.length - 1][0]}`;
  return letters.toUpperCase();
}

const ROLE_LABELS: Record<Role, string> = { STUDENT: 'Student', TEACHER: 'Teacher', ADMIN: 'Admin' };

/** "Student", "Teacher", "Admin" */
export function roleLabel(role: Role | string | null | undefined): string {
  return (role && ROLE_LABELS[role as Role]) || EMPTY;
}

/** "CREDIT_3_00" → "3.00" credits text. */
export function formatCredits(credits: string | number | null | undefined): string {
  if (credits === null || credits === undefined || credits === '') return EMPTY;
  if (typeof credits === 'number') return credits.toFixed(2);
  const match = /^CREDIT_(\d+)_(\d+)$/.exec(credits);
  return match ? `${Number(match[1])}.${match[2]}` : credits;
}
