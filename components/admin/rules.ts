// Admin page rules (pure: no imports, so tests/admin-rules.test.mjs can run them in Node).

// No look-alike characters (0/O, 1/l/I), so a password read aloud or copied by hand works.
export const PASSWORD_LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
export const PASSWORD_DIGITS = '23456789';
export const PASSWORD_CHARS = PASSWORD_LETTERS + PASSWORD_DIGITS;

export type RandomFill = (values: Uint32Array) => unknown;

/** A random whole number in `0 .. max - 1`, with every number equally likely (no modulo bias). */
export function randomIndex(max: number, fill: RandomFill = (values) => globalThis.crypto.getRandomValues(values)): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buffer = new Uint32Array(1);
  do {
    fill(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

/**
 * A random 10-character temporary password with at least two letters and two digits (passes the
 * server's rules). Every allowed character is equally likely.
 */
export function makeTemporaryPassword(
  length = 10,
  fill: RandomFill = (values) => globalThis.crypto.getRandomValues(values)
): string {
  const minEach = Math.min(2, Math.floor(length / 2));
  while (true) {
    let letters = 0;
    let digits = 0;
    let password = '';
    for (let i = 0; i < length; i += 1) {
      const pick = randomIndex(PASSWORD_CHARS.length, fill);
      if (pick < PASSWORD_LETTERS.length) letters += 1;
      else digits += 1;
      password += PASSWORD_CHARS[pick];
    }
    if (letters >= minEach && digits >= minEach) return password;
  }
}

/**
 * What a page does when it comes back into view (Back, a crumb or its nav item going back to it):
 * a quiet refresh while it shows data, a normal load on an error screen (it tries again), and
 * while a load still runs, a quiet refresh once that answers (it may have been sent before the
 * admin left).
 */
export function focusAction(running: boolean, hasData: boolean): 'later' | 'refresh' | 'load' {
  if (running) return 'later';
  return hasData ? 'refresh' : 'load';
}

/**
 * A quiet refresh's answer replaces the data only while it is the newest request and nothing was
 * changed on screen since it started (an older answer would undo a save shown in place).
 */
export function takeQuietAnswer(request: number, latest: number, editsAtStart: number, edits: number): boolean {
  return request === latest && edits === editsAtStart;
}

/**
 * The students ticked for promoting after the class list loads (again): everyone until the admin
 * changes the ticks; after that their ticks stay, minus students who are no longer members.
 */
export function chosenAfterLoad<T>(memberIds: T[], current: Set<T> | null, changedByAdmin: boolean): Set<T> {
  if (!current || !changedByAdmin) return new Set(memberIds);
  return new Set(memberIds.filter((id) => current.has(id)));
}

/** A choice from a list that loaded again: kept while the list still offers it, else `none`. */
export function keepChoice<T>(value: T, offered: T[], none: T): T {
  return value === none || offered.includes(value) ? value : none;
}
