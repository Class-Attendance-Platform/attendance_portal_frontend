export const CODE_MAX_WAIT_MS = 5000;

export function codeRefetchDelay(expiresIn: number): number {
  const untilChange = Math.max(1, Number.isFinite(expiresIn) ? expiresIn : 0) * 1000 + 300;
  return Math.min(CODE_MAX_WAIT_MS, untilChange);
}

export const LIVE_CHECK_MS = 20000;

export function liveCheckDelay(timeLeft: number | null | undefined): number {
  if (typeof timeLeft !== 'number' || !Number.isFinite(timeLeft)) return LIVE_CHECK_MS;
  return Math.min(LIVE_CHECK_MS, Math.max(0, timeLeft) * 1000 + 2000);
}

export function enrolledOn(student: { joined_at: string | null; left_at: string | null }, date: string): boolean {
  if (student.joined_at && student.joined_at > date) return false;
  if (student.left_at && date >= student.left_at) return false;
  return true;
}

export function shownLeftAt(leftAt: string | null, newestClass: string | null | undefined, semesterActive: boolean): string | null {
  if (!leftAt) return null;
  return semesterActive || (!!newestClass && newestClass >= leftAt) ? leftAt : null;
}

export function isDateParam(value: string | null | undefined): value is string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

export type SemesterRange = { start: string | null; end: string | null };

export function rollCallRange(semester: { is_active: boolean; start_date?: string | null; end_date?: string | null }): SemesterRange {
  return { start: semester.start_date || null, end: (!semester.is_active && semester.end_date) || null };
}

export function inRange(date: string, range: SemesterRange): boolean {
  return (!range.start || date >= range.start) && (!range.end || date <= range.end);
}

export function defaultRollCallDate(finished: boolean, classDates: string[], range: SemesterRange, today: string): string {
  if (!finished) return today;
  const newest = classDates.find((date) => date <= today && inRange(date, range));
  return newest ?? (range.end && range.end < today ? range.end : today);
}

export type Mark = 'PRESENT' | 'ABSENT' | null;

export function startingMarks(students: { profile_id: string; status: Mark }[], hasClass: boolean): Record<string, Mark> {
  const fallback: Mark = hasClass ? null : 'ABSENT';
  return Object.fromEntries(students.map((row) => [row.profile_id, row.status ?? fallback]));
}

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
