// One request for callers that ask for the same thing at about the same time, e.g. the profile
// (GET /auth/me/): the start-up refresh and the account page's own, which opens right after it.
//
// No imports and only type annotations TypeScript can strip: Node runs this file directly in tests
// (tests/auth-shared-request.test.mjs).

/**
 * Returns `ask(key, load)`. While a request for `key` runs, and for `reuseMs` after it succeeded,
 * asking again returns that request's promise instead of calling `load`. A failed request is not
 * reused (the next ask tries again), and neither is one made for another key (e.g. before a
 * sign-out).
 */
export function sharedRequest<T>(reuseMs: number, now: () => number = Date.now) {
  let last: { key: number; promise: Promise<T>; doneAt: number | null } | null = null;
  return (key: number, load: () => Promise<T>): Promise<T> => {
    if (last && last.key === key && (last.doneAt === null || now() - last.doneAt < reuseMs)) return last.promise;
    const entry: { key: number; promise: Promise<T>; doneAt: number | null } = { key, promise: load(), doneAt: null };
    last = entry;
    entry.promise.then(
      () => {
        entry.doneAt = now();
      },
      () => {
        if (last === entry) last = null;
      }
    );
    return entry.promise;
  };
}
