export const PASSWORD_LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
export const PASSWORD_DIGITS = '23456789';
export const PASSWORD_CHARS = PASSWORD_LETTERS + PASSWORD_DIGITS;

export type RandomFill = (values: Uint32Array) => unknown;

export function randomIndex(max: number, fill: RandomFill = (values) => globalThis.crypto.getRandomValues(values)): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buffer = new Uint32Array(1);
  do {
    fill(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

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

export function focusAction(running: boolean, hasData: boolean): 'later' | 'refresh' | 'load' {
  if (running) return 'later';
  return hasData ? 'refresh' : 'load';
}

export function takeQuietAnswer(request: number, latest: number, editsAtStart: number, edits: number): boolean {
  return request === latest && edits === editsAtStart;
}

export function chosenAfterLoad<T>(memberIds: T[], current: Set<T> | null, changedByAdmin: boolean): Set<T> {
  if (!current || !changedByAdmin) return new Set(memberIds);
  return new Set(memberIds.filter((id) => current.has(id)));
}

export function keepChoice<T>(value: T, offered: T[], none: T): T {
  return value === none || offered.includes(value) ? value : none;
}
