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
