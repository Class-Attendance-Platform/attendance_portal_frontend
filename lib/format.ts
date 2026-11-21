import { dhakaClock, parseISODate } from './dates';
import type { Role } from './api/types';

export const EMPTY = '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (value: number) => String(value).padStart(2, '0');

function dateParts(value: string | Date): { year: number; month: number; day: number } | null {
  if (typeof value === 'string' && value.length === 10) return parseISODate(value);
  const clock = dhakaClock(value);
  if (Number.isNaN(clock.getTime())) return null;
  return { year: clock.getUTCFullYear(), month: clock.getUTCMonth() + 1, day: clock.getUTCDate() };
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const parts = dateParts(value);
  return parts ? `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}` : EMPTY;
}

export function formatDateWithWeekday(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const parts = dateParts(value);
  if (!parts) return EMPTY;
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return `${WEEKDAYS[day]}, ${formatDate(value)}`;
}

export function formatMonth(year: number, month: number): string {
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

export const weekdayShort = (index: number) => WEEKDAYS[index];

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const clock = dhakaClock(value);
  if (Number.isNaN(clock.getTime())) return EMPTY;
  const hours = clock.getUTCHours();
  return `${hours % 12 || 12}:${pad(clock.getUTCMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY;
  const date = formatDate(value);
  return date === EMPTY ? EMPTY : `${date}, ${formatTime(value)}`;
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

export { formatPercent } from './percent';

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatCode(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : code;
}

const LEVEL_NUMBERS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };

export function levelNumber(level: string | number | null | undefined): number | null {
  if (level === null || level === undefined || level === '') return null;
  if (typeof level === 'number') return level;
  const asNumber = Number(level);
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;
  return LEVEL_NUMBERS[level.trim().toLowerCase()] ?? null;
}

export function levelLabel(level: string | number | null | undefined): string {
  const number = levelNumber(level);
  if (number) return `Level ${number}`;
  return level ? `Level ${level}` : EMPTY;
}

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

export function fullName(person: Named | null | undefined): string {
  if (!person) return EMPTY;
  const joined = [person.first_name, person.last_name].filter((part) => part && part.trim()).join(' ').trim();
  return joined || person.userName?.trim() || person.name?.trim() || person.email || EMPTY;
}

export function firstName(person: Named | null | undefined): string {
  return person?.first_name?.trim() || fullName(person).split(' ')[0];
}

export function initials(name: string | null | undefined): string {
  const words = (name ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9À-￿]+/, ''))
    .filter((word) => word && !/^(dr|mr|mrs|ms|prof)\.?$/i.test(word));
  if (!words.length) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 1) : `${words[0][0]}${words[words.length - 1][0]}`;
  return letters.toUpperCase();
}

const ROLE_LABELS: Record<Role, string> = { STUDENT: 'Student', TEACHER: 'Teacher', ADMIN: 'Admin' };

export function roleLabel(role: Role | string | null | undefined): string {
  return (role && ROLE_LABELS[role as Role]) || EMPTY;
}

export function formatCredits(credits: string | number | null | undefined): string {
  if (credits === null || credits === undefined || credits === '') return EMPTY;
  if (typeof credits === 'number') return credits.toFixed(2);
  const match = /^CREDIT_(\d+)_(\d+)$/.exec(credits);
  return match ? `${Number(match[1])}.${match[2]}` : credits;
}
