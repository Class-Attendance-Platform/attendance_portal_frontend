// Admin page rules (pure: no imports, so tests/admin-rules.test.mjs can run them in Node).

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
