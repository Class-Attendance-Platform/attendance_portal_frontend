// App version rules (GET /config/app/ `min_app_version` / `latest_app_version`).
// No imports, so tests/version.test.mjs can run it in Node.

/** "v1.2.3", "1.2", "1.2.3-beta" → [1, 2, 3]. Null when there is no number at the start. */
export function parseVersion(raw: string | null | undefined): number[] | null {
  const match = /^\s*v?(\d+(?:\.\d+)*)/i.exec(String(raw ?? ''));
  if (!match) return null;
  return match[1].split('.').map((part) => Number(part));
}

/**
 * -1 if a is older than b, 0 if they are the same, 1 if a is newer. Missing parts count as 0
 * ("1.2" = "1.2.0"); anything after the numbers ("-beta") is ignored. Null if either cannot be read.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): -1 | 0 | 1 | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const x = left[index] ?? 0;
    const y = right[index] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export type UpdateStatus = 'current' | 'available' | 'required';

/**
 * required: the installed version is below the minimum (the app blocks with "Please update").
 * available: below the latest (a notice that can be closed). current: otherwise, and whenever a
 * version cannot be read (an unreadable setting must never lock people out).
 */
export function updateStatus(
  installed: string | null | undefined,
  minimum: string | null | undefined,
  latest: string | null | undefined
): UpdateStatus {
  if (compareVersions(installed, minimum) === -1) return 'required';
  if (compareVersions(installed, latest) === -1) return 'available';
  return 'current';
}
