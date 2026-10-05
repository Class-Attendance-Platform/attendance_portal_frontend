// Pure helpers for the student screens. No imports, so tests/student-logic.test.mjs can run
// them in Node (npm test).

/** A check-in code has 6 digits. */
export const CODE_LENGTH = 6;

const UUID_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** A session id from a link or a scanned QR (a UUID). */
export function isSessionId(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value);
}

/** Exactly 6 digits. */
export function isCode(value: string | null | undefined): value is string {
  return !!value && /^\d{6}$/.test(value);
}

/**
 * What the code field keeps from typing or pasting: digits only, at most 6. Bengali digits
 * (০–৯) become 0–9; spaces, dashes and other characters are dropped ("482 913" → "482913").
 */
export function cleanCode(input: string | null | undefined): string {
  const ascii = (input ?? '').replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));
  return ascii.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** The first value of a route parameter (expo-router gives string | string[]). */
export function firstParam(value: string | string[] | null | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? undefined;
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Query parameters of a URL or path (no URL API: React Native's is incomplete). */
export function queryParams(link: string): Record<string, string> {
  const result: Record<string, string> = {};
  const start = link.indexOf('?');
  if (start === -1) return result;
  const hash = link.indexOf('#', start);
  const query = link.slice(start + 1, hash === -1 ? undefined : hash);
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const equals = pair.indexOf('=');
    const key = decode(equals === -1 ? pair : pair.slice(0, equals));
    const value = decode(equals === -1 ? '' : pair.slice(equals + 1));
    if (!(key in result)) result[key] = value;
  }
  return result;
}

/** The path of a URL or path, without query, hash, scheme or host. */
function pathOf(link: string): string {
  const end = link.search(/[?#]/);
  let path = end === -1 ? link : link.slice(0, end);
  const scheme = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i.exec(path);
  if (scheme) path = path.slice(scheme[0].length);
  return path || '/';
}

export type ScannedLink =
  /** A check-in QR: `…/check-in?s=<session id>&c=<6 digits>`. */
  | { kind: 'check-in'; sessionId: string; code: string }
  /** A QR from the old app (`/attendance/submit?sessionId=…&qrToken=…`): no longer works. */
  | { kind: 'old' }
  /** Something else (another site, a broken link). */
  | { kind: 'other' };

/**
 * Reads a scanned QR. The teacher's QR is the web link `{WEB_URL}/check-in?s=<session>&c=<code>`;
 * the app only takes the session id and the code from it (the host does not matter: the check-in
 * always goes to this app's own server).
 */
export function readCheckInLink(data: string | null | undefined): ScannedLink {
  const link = (data ?? '').trim();
  if (!link) return { kind: 'other' };
  const path = pathOf(link).replace(/\/+$/, '');
  if (/\/attendance\/submit$/i.test(path)) return { kind: 'old' };
  if (!/(^|\/)check-in$/i.test(path)) return { kind: 'other' };
  const params = queryParams(link);
  const code = cleanCode(params.c);
  if (!isSessionId(params.s) || !isCode(code)) return { kind: 'other' };
  return { kind: 'check-in', sessionId: params.s, code };
}

/**
 * The catch-up line for a course below the minimum: "Attend the next 3 classes to reach 75%."
 * Empty when already there (0); a plain sentence when it can no longer be reached (null).
 */
export function catchUpText(classesNeeded: number | null | undefined, min: number): string {
  if (classesNeeded === 0) return '';
  if (classesNeeded === null || classesNeeded === undefined) {
    return `You can't reach ${min}% in this course any more. Talk to your teacher.`;
  }
  return `Attend the next ${classesNeeded} ${classesNeeded === 1 ? 'class' : 'classes'} to reach ${min}%.`;
}

type Membership = { is_active: boolean; left_at: string | null };

/** The semester the student is in now: active and not left. */
export function currentSemester<T extends Membership>(semesters: T[]): T | undefined {
  return semesters.find((semester) => semester.is_active && !semester.left_at);
}

/**
 * Semesters for the courses page: the current one first, then the others newest first. The API
 * sorts them by level then term (oldest first).
 */
export function orderSemesters<T extends Membership>(semesters: T[]): T[] {
  const current = currentSemester(semesters);
  const others = semesters.filter((semester) => semester !== current).reverse();
  return current ? [current, ...others] : others;
}

type Day = { date: string; status: string | null };

/**
 * Why a class day does not count for the student (status null): it is before they joined the
 * class group or after they left. `days` are newest first, as the API sends them.
 */
export function outsideReason(
  days: Day[],
  index: number
): 'Before you joined' | 'After you left' | 'Not on the class list' {
  const counted = days.map((day, position) => (day.status ? position : -1)).filter((position) => position !== -1);
  if (!counted.length) return 'Not on the class list';
  // Newest first: a higher index is an older date.
  if (index > counted[counted.length - 1]) return 'Before you joined';
  if (index < counted[0]) return 'After you left';
  return 'Not on the class list';
}

export type CheckInProblem = {
  /** info: nothing went wrong for the student (already checked in). */
  tone: 'info' | 'warn' | 'error';
  title: string;
  message: string;
  /** Worth trying the same thing again (network, busy server). */
  retry: boolean;
};

/**
 * A readable result for a failed check-in. `via`: "link" for a QR link or a scanned QR,
 * "code" for a typed code.
 */
export function describeCheckInError(
  error: { code?: string | null; status?: number; message?: string },
  via: 'link' | 'code'
): CheckInProblem {
  switch (error.code) {
    case 'code_invalid':
      return via === 'link'
        ? {
            tone: 'warn',
            title: 'This QR code has expired',
            message: 'The code changes every 30 seconds. Scan the QR again, or type the 6-digit code shown in class.',
            retry: false,
          }
        : {
            tone: 'warn',
            title: "That code didn't work",
            message: 'It is wrong or has expired. The code changes every 30 seconds: type the newest one.',
            retry: false,
          };
    case 'not_enrolled':
      return {
        tone: 'error',
        title: "You're not on this class list",
        message: 'Only students of this course can check in. If this is your class, ask the department office to add you.',
        retry: false,
      };
    case 'already_checked_in':
      return {
        tone: 'info',
        title: "You're already checked in",
        message: 'Your attendance for this class is already recorded. Nothing else to do.',
        retry: false,
      };
    case 'device_used':
      return {
        tone: 'error',
        title: 'This phone was already used',
        message:
          'Another student checked in with this phone or browser in this class. Each student checks in on their own phone. Ask your teacher to mark you present.',
        retry: false,
      };
    case 'session_ended':
      return {
        tone: 'warn',
        title: 'Attendance has closed',
        message: 'This class is not taking attendance any more. Ask your teacher if you need to be marked present.',
        retry: false,
      };
    case 'throttled':
      return {
        tone: 'warn',
        title: 'Too many tries',
        message: error.message || 'Please wait a minute and try again.',
        retry: true,
      };
    default:
      break;
  }
  if (error.status === 0) {
    return {
      tone: 'error',
      title: 'No connection',
      message: error.message || "Can't reach the server. Check your internet connection and try again.",
      retry: true,
    };
  }
  return {
    tone: 'error',
    title: "Couldn't check you in",
    message: error.message || 'Something went wrong. Please try again.',
    retry: true,
  };
}
