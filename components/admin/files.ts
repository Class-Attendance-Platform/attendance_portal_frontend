import { Platform } from 'react-native';

// Temporary passwords and small text files (CSV) made in the browser.

// No look-alike characters (0/O, 1/l/I), so a password read aloud or copied by hand works.
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

function randomIndex(max: number): number {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** A random 10-character temporary password with letters and digits (passes the server's rules). */
export function makeTemporaryPassword(length = 10): string {
  const all = LETTERS + DIGITS;
  const chars = Array.from({ length }, () => all[randomIndex(all.length)]);
  // At least two letters and two digits, in random places.
  const places = new Set<number>();
  while (places.size < 4) places.add(randomIndex(length));
  [...places].forEach((place, index) => {
    chars[place] = index < 2 ? LETTERS[randomIndex(LETTERS.length)] : DIGITS[randomIndex(DIGITS.length)];
  });
  return chars.join('');
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A CSV text: one header row, then the rows (cells quoted when needed). */
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Saving a file made in the app works on the web (and the desktop app) only. */
export const canSaveFiles = Platform.OS === 'web';

/** Web: saves `text` as a file through the browser. */
export function saveTextFile(name: string, text: string, mimeType = 'text/csv') {
  if (!canSaveFiles || typeof document === 'undefined') return;
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
