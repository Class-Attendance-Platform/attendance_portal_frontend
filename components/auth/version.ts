export function parseVersion(raw: string | null | undefined): number[] | null {
  const match = /^\s*v?(\d+(?:\.\d+)*)/i.exec(String(raw ?? ''));
  if (!match) return null;
  return match[1].split('.').map((part) => Number(part));
}

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

export function updateStatus(
  installed: string | null | undefined,
  minimum: string | null | undefined,
  latest: string | null | undefined
): UpdateStatus {
  if (compareVersions(installed, minimum) === -1) return 'required';
  if (compareVersions(installed, latest) === -1) return 'available';
  return 'current';
}
