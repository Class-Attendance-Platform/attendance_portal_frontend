import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { makeTemporaryPassword as buildTemporaryPassword } from './rules';

export function makeTemporaryPassword(length = 10): string {
  return buildTemporaryPassword(length, (values) => Crypto.getRandomValues(values));
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const canSaveFiles = Platform.OS === 'web';

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
