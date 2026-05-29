export type Level = 'First' | 'Second' | 'Third' | 'Fourth';
export type SemesterName = 'I' | 'II';

export const LEVELS: Level[] = ['First', 'Second', 'Third', 'Fourth'];
export const SEMESTERS: SemesterName[] = ['I', 'II'];

export type DateArray = [number, number, number];

export function formatDateArray(date: DateArray | string): string {
  if (Array.isArray(date)) {
    return date.map(n => String(n).padStart(2, '0')).join('-');
  }
  return String(date);
}

export function parseDateString(dateStr: string): DateArray {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts as DateArray;
  }
  return [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
}
