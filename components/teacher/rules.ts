// Small rules of the teacher screens. No imports, so tests/teacher-rules.test.mjs can run them in Node.

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

/**
 * A student was a member on `date` (`YYYY-MM-DD`): joined_at <= date < left_at, where a missing
 * joined_at means "from the start" and a missing left_at "still a member".
 */
export function enrolledOn(student: { joined_at: string | null; left_at: string | null }, date: string): boolean {
  if (student.joined_at && student.joined_at > date) return false;
  if (student.left_at && date >= student.left_at) return false;
  return true;
}
