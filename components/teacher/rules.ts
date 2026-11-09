// Small rules of the teacher screens. No imports, so tests/teacher-*.test.mjs can run them in Node.

/** Never show a code for longer than this without asking again (ms). */
export const CODE_MAX_WAIT_MS = 5000;

/**
 * When to fetch the 6-digit code again: just after it changes (`expiresIn` seconds from the
 * server), and at least every 5 s.
 */
export function codeRefetchDelay(expiresIn: number): number {
  const untilChange = Math.max(1, Number.isFinite(expiresIn) ? expiresIn : 0) * 1000 + 300;
  return Math.min(CODE_MAX_WAIT_MS, untilChange);
}

/** How often a course tab other than Attendance asks whether the live session still runs (ms). */
export const LIVE_CHECK_MS = 20000;

/**
 * When to ask again whether a live session still runs: just after its time is up (`timeLeft`
 * seconds from the server, which saves an ended session when asked), and at least every 20 s.
 */
export function liveCheckDelay(timeLeft: number | null | undefined): number {
  if (typeof timeLeft !== 'number' || !Number.isFinite(timeLeft)) return LIVE_CHECK_MS;
  return Math.min(LIVE_CHECK_MS, Math.max(0, timeLeft) * 1000 + 2000);
}

/**
 * A student was a member on `date` (`YYYY-MM-DD`): joined_at <= date < left_at, where a missing
 * joined_at means "from the start" and a missing left_at "still a member".
 */
export function enrolledOn(student: { joined_at: string | null; left_at: string | null }, date: string): boolean {
  if (student.joined_at && student.joined_at > date) return false;
  if (student.left_at && date >= student.left_at) return false;
  return true;
}

/**
 * The leaving date worth showing. In a running semester leaving is a removal: always shown. Once
 * it is finished, only when a class was held on or after it (`newestClass`): students promoted
 * after the semester's last class left nothing out.
 */
export function shownLeftAt(leftAt: string | null, newestClass: string | null | undefined, semesterActive: boolean): string | null {
  if (!leftAt) return null;
  return semesterActive || (!!newestClass && newestClass >= leftAt) ? leftAt : null;
}

/** A `?date=` value that is exactly `YYYY-MM-DD` and a real day (no time part, no extra text). */
export function isDateParam(value: string | null | undefined): value is string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

/** The dates a roll call can use (`YYYY-MM-DD`; null = no limit). Future dates never. */
export type SemesterRange = { start: string | null; end: string | null };

/**
 * From the semester's start date (when set), until its end date once it is finished (when set): a
 * running semester may still hold a make-up class after its planned end.
 */
export function rollCallRange(semester: { is_active: boolean; start_date?: string | null; end_date?: string | null }): SemesterRange {
  return { start: semester.start_date || null, end: (!semester.is_active && semester.end_date) || null };
}

export function inRange(date: string, range: SemesterRange): boolean {
  return (!range.start || date >= range.start) && (!range.end || date <= range.end);
}

/**
 * The roll call's date when none is asked for: today; for a finished semester (nobody is enrolled
 * today) its newest class inside the range (`classDates` newest first), else its last day.
 */
export function defaultRollCallDate(finished: boolean, classDates: string[], range: SemesterRange, today: string): string {
  if (!finished) return today;
  const newest = classDates.find((date) => date <= today && inRange(date, range));
  return newest ?? (range.end && range.end < today ? range.end : today);
}

/** A roll call mark: null = no mark (no log that day). */
export type Mark = 'PRESENT' | 'ABSENT' | null;

/**
 * Each student's mark when a roll call opens: what is saved. On a date without a class everyone
 * starts absent; on a date that has one, a student with no mark yet (e.g. who joined after it)
 * stays unmarked until the teacher picks Present or Absent.
 */
export function startingMarks(students: { profile_id: string; status: Mark }[], hasClass: boolean): Record<string, Mark> {
  const fallback: Mark = hasClass ? null : 'ABSENT';
  return Object.fromEntries(students.map((row) => [row.profile_id, row.status ?? fallback]));
}

/**
 * The marks after the list loads again (Back to the page, a refused save): students the teacher
 * switched (`marks` differs from `initial`) keep the switch; the others show what `fresh` says.
 */
export function keepSwitches(
  fresh: Record<string, Mark>,
  marks: Record<string, Mark>,
  initial: Record<string, Mark>
): Record<string, Mark> {
  const next: Record<string, Mark> = {};
  for (const [id, status] of Object.entries(fresh)) {
    next[id] = id in marks && marks[id] !== initial[id] ? marks[id] : status;
  }
  return next;
}

/** What a roll call sends: students marked Present, and Absent. Unmarked ones are left as they are. */
export function rollCallIds(
  students: { profile_id: string }[],
  marks: Record<string, Mark>
): { present_profile_ids: string[]; absent_profile_ids: string[] } {
  const present_profile_ids: string[] = [];
  const absent_profile_ids: string[] = [];
  for (const { profile_id } of students) {
    if (marks[profile_id] === 'PRESENT') present_profile_ids.push(profile_id);
    else if (marks[profile_id] === 'ABSENT') absent_profile_ids.push(profile_id);
  }
  return { present_profile_ids, absent_profile_ids };
}
