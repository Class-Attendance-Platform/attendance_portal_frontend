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

/** The path of a check-in link: `/check-in` (any host). */
const CHECK_IN_PATH = /(^|\/)check-in$/i;

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
  if (!CHECK_IN_PATH.test(path)) return { kind: 'other' };
  const params = queryParams(link);
  const code = cleanCode(params.c);
  if (!isSessionId(params.s) || !isCode(code)) return { kind: 'other' };
  return { kind: 'check-in', sessionId: params.s, code };
}

export type CodeFieldInput =
  /** Digits for the field (at most 6). */
  | { kind: 'code'; code: string }
  /** A whole check-in link: check in with it at once. */
  | { kind: 'check-in'; sessionId: string; code: string }
  /** Another link: the field stays empty and shows this note. */
  | { kind: 'note'; note: string };

/**
 * What the code field does with typed or pasted text. Digits (also with spaces, dashes or Bengali
 * digits) are the code; a pasted check-in link checks in. Any other link leaves the field empty with
 * a note, so digits from an address (a session id, an IP address) never end up as the code.
 */
export function readCodeField(text: string | null | undefined): CodeFieldInput {
  const value = (text ?? '').trim();
  // A web address has a scheme, "www." or a path ("example.com/watch"); "Code: 482 913" has none.
  if (!/:\/\/|www\.|\/[a-z]/i.test(value)) return { kind: 'code', code: cleanCode(value) };
  const link = readCheckInLink(value);
  if (link.kind === 'check-in') return link;
  if (link.kind === 'old') {
    return { kind: 'note', note: 'This link is from the old app and no longer works. Type the 6-digit code.' };
  }
  if (CHECK_IN_PATH.test(pathOf(value).replace(/\/+$/, ''))) {
    return { kind: 'note', note: 'This check-in link is incomplete. Type the 6-digit code instead.' };
  }
  return { kind: 'note', note: "That isn't a check-in link. Type the 6-digit code." };
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

/**
 * Can more classes still count for the student in this course? "finished": the semester is over
 * (no new classes); "left": the student left it (promoted or removed). Only "open" gets catch-up
 * advice: telling them to attend more classes would be impossible to follow otherwise.
 */
export type CatchUpState = 'open' | 'finished' | 'left';

export function catchUpState(semesterActive: boolean, leftAt: string | null | undefined): CatchUpState {
  if (!semesterActive) return 'finished';
  return leftAt ? 'left' : 'open';
}

/** The warning under a course below the minimum: "Below 75%. Attend the next 3 classes to reach 75%." */
export function belowMinText(classesNeeded: number | null | undefined, min: number, state: CatchUpState = 'open'): string {
  if (state === 'finished') return `Below ${min}%. This semester is finished.`;
  if (state === 'left') return `Below ${min}%. You left this semester.`;
  const catchUp = catchUpText(classesNeeded, min);
  return `Below ${min}%.${catchUp ? ` ${catchUp}` : ''}`;
}

/**
 * A course or semester without a counted class: "No classes yet" while more classes can count,
 * "No classes held" once the semester is finished or the student left it (no more will come).
 */
export function noClassesText(state: CatchUpState = 'open'): 'No classes yet' | 'No classes held' {
  return state === 'open' ? 'No classes yet' : 'No classes held';
}

type CourseNumbers = { held: number; below_min: boolean; classes_needed: number | null | undefined };

/**
 * Home's "Courses below 75%" tile (desktop). It agrees with the course rows: no claim about the
 * courses before a class was held, and "talk to your teacher" when none of the low courses can
 * reach the minimum any more (classes_needed null, e.g. a 100% minimum).
 */
export function belowMinSummary(courses: CourseNumbers[], min: number): { value: string; hint: string; low: number } {
  if (!courses.length) return { value: '—', hint: 'No courses yet', low: 0 };
  if (!courses.some((course) => course.held > 0)) return { value: '—', hint: 'No classes yet', low: 0 };
  const low = courses.filter((course) => course.held > 0 && course.below_min);
  if (!low.length) return { value: 'None', hint: `All at or above ${min}%`, low: 0 };
  const canCatchUp = low.some((course) => typeof course.classes_needed === 'number');
  return {
    value: String(low.length),
    hint: canCatchUp
      ? 'Attend the next classes to catch up'
      : `${min}% can't be reached any more. Talk to your ${low.length === 1 ? 'teacher' : 'teachers'}.`,
    low: low.length,
  };
}

type Membership = { is_active: boolean; left_at: string | null; level?: string; semester?: string };

/** A semester the student is in now: active (not finished) and not left. */
export function isCurrentSemester(semester: Membership): boolean {
  return semester.is_active && !semester.left_at;
}

/**
 * The semester Home shows: the one the student is in now. A student is in one current semester
 * only (the office can't add them to a second one), but older data may have two: then the one
 * matching their profile's level and term, else the highest level (the API sorts by level then
 * term, so the last one).
 */
export function currentSemester<T extends Membership>(
  semesters: T[],
  prefer?: { level: string; term: string } | null
): T | undefined {
  const current = semesters.filter(isCurrentSemester);
  const match = prefer ? current.find((semester) => semester.level === prefer.level && semester.semester === prefer.term) : undefined;
  return match ?? current[current.length - 1];
}

/**
 * Semesters for the courses page: the current one first (the one Home shows), then any other
 * current one, then the others newest first. The API sorts them by level then term (oldest first).
 */
export function orderSemesters<T extends Membership>(semesters: T[], prefer?: { level: string; term: string } | null): T[] {
  const main = currentSemester(semesters, prefer);
  const otherCurrent = semesters.filter((semester) => semester !== main && isCurrentSemester(semester)).reverse();
  const others = semesters.filter((semester) => !isCurrentSemester(semester)).reverse();
  return main ? [main, ...otherCurrent, ...others] : others;
}

/**
 * Did a live class end? True when a session of the last "Live now" list (`before`, session ids) is
 * gone from the new one: the teacher stopped it or its timer ran out, so it is saved now.
 */
export function liveEnded(before: readonly string[] | null | undefined, now: readonly string[]): boolean {
  return !!before && before.some((id) => !now.includes(id));
}

/**
 * Why an absent day is absent, from GET /student/course-info/<id>/ `absent_reason` (changed: a
 * teacher corrected it; roll_call; class_photo; not_checked_in: a live class). '' when unknown.
 */
export function absentReasonText(reason: string | null | undefined): string {
  switch (reason) {
    case 'changed':
      return 'Marked absent by teacher';
    case 'roll_call':
      return 'Marked absent in roll call';
    case 'class_photo':
      return 'Not found in the class photo';
    case 'not_checked_in':
      return 'Not checked in';
    default:
      return '';
  }
}

type Day = { date: string; status: string | null };

/**
 * Why a class day does not count for the student (status null): it is before they joined the
 * class group (or on the join day, for a class held before they were added) or after they left.
 * `days` are newest first, as the API sends them. With the membership dates (GET
 * /student/course-info/<id>/ sends them) the dates decide; without them the counted days do.
 */
export function outsideReason(
  days: Day[],
  index: number,
  membership?: { joined_at: string | null; left_at: string | null } | null
): 'Before you joined' | 'After you left' | 'Not on the class list' {
  const date = days[index]?.date;
  if (membership && date) {
    if (membership.left_at && date >= membership.left_at) return 'After you left';
    if (membership.joined_at && date <= membership.joined_at) return 'Before you joined';
  }
  const counted = days.map((day, position) => (day.status ? position : -1)).filter((position) => position !== -1);
  // Only members can open a course, so with nothing counted yet they joined after these classes.
  if (!counted.length) return 'Before you joined';
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
  /**
   * Scanning or typing a code again cannot help (this phone was used, not on the class list,
   * attendance closed): only the teacher can mark them now.
   */
  final?: boolean;
};

/** Text as a sentence: trimmed, ending with a full stop, so another sentence can follow. */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

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
            message:
              'It is wrong, has expired, or is not for one of your classes. The code changes every 30 seconds: type the newest one.',
            retry: false,
          };
    case 'not_enrolled':
      return {
        tone: 'error',
        title: "You're not on this class list",
        message: 'Only students of this course can check in. If this is your class, ask the department office to add you.',
        retry: false,
        final: true,
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
        final: true,
      };
    case 'session_ended':
      return {
        tone: 'warn',
        title: 'Attendance has closed',
        message: 'This class is not taking attendance any more. Ask your teacher if you need to be marked present.',
        retry: false,
        final: true,
      };
    case 'throttled':
      // A QR link's code expires before the wait is over: sending it again cannot work.
      return via === 'link'
        ? {
            tone: 'warn',
            title: 'Too many tries',
            message: error.message
              ? `${sentence(error.message)} Then scan the QR again, or type the newest code.`
              : 'Please wait a minute, then scan the QR again or type the newest code.',
            retry: false,
          }
        : {
            tone: 'warn',
            title: 'Too many tries',
            message: error.message || 'Please wait a minute and try again.',
            retry: true,
          };
    case 'timeout':
      // No answer within the time limit (lib/api/client.ts gives it status 0 too): not "No connection".
      return {
        tone: 'error',
        title: 'The server is slow',
        message: error.message || 'The server took too long to answer. Please try again.',
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

/** The part of a GET /student/live/ row the check-in rules need. */
export type LiveRow = { session_id: string; checked_in: boolean };

/** Failed check-ins that the fresh "Live now" list explains better (see describeWithLiveList). */
export function needsLiveList(error: { code?: string | null }, via: 'link' | 'code'): boolean {
  return error.code === (via === 'link' ? 'session_ended' : 'code_invalid');
}

/**
 * describeCheckInError, checked against the "Live now" list asked for right after the failure
 * (`fresh`; null when it could not be loaded). The server cannot always say what happened: a typed
 * code is only compared with the student's own live classes, and a QR names one session.
 * - A closed QR while another class of theirs is open (attendance started again, the next class):
 *   not final, they scan or type the newest code.
 * - A typed code that matched nothing: wrong or expired while a class of theirs is open; "closed"
 *   (final) when the class they came for is gone and nothing is open; "none of your classes" when
 *   no class of theirs is taking attendance at all.
 * `sessionId`: the class they came for (the QR's session; `?s=` for a typed code). `listed`: the
 * list the page showed when they tried (null: not loaded yet).
 */
export function describeWithLiveList(
  error: { code?: string | null; status?: number; message?: string },
  via: 'link' | 'code',
  { sessionId, listed = null, fresh }: { sessionId?: string | null; listed?: LiveRow[] | null; fresh: LiveRow[] | null }
): CheckInProblem {
  const problem = describeCheckInError(error, via);
  if (!fresh || !needsLiveList(error, via)) return problem;
  const open = fresh.filter((row) => !row.checked_in);
  if (via === 'link') {
    if (!open.some((row) => row.session_id !== sessionId)) return problem;
    return {
      tone: 'warn',
      title: 'This QR code has closed',
      message: 'A class of yours is taking attendance now. Scan the newest QR, or type the 6-digit code.',
      retry: false,
    };
  }
  if (open.length) return problem;
  // The class they came for: ?s=, else the classes the page showed open (not those shown checked in).
  const shown = listed ?? [];
  const cameFor = (sessionId ? [sessionId] : shown.map((row) => row.session_id)).filter(
    (id) => !shown.some((row) => row.session_id === id && row.checked_in)
  );
  if (cameFor.some((id) => !fresh.some((row) => row.session_id === id))) {
    return describeCheckInError({ code: 'session_ended' }, via);
  }
  if (fresh.length) return problem;
  return {
    tone: 'warn',
    title: "That code didn't work",
    message:
      "None of your classes is taking attendance right now, so this code can't check you in. If your class is taking attendance, you may not be on its class list: ask your teacher.",
    retry: false,
  };
}
