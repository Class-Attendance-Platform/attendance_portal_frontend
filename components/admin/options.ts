import type { SelectOption } from '@/components/ui';
import type { AppConfig, Level, Term } from '@/lib/api';
import { formatCredits, levelLabel, levelNumber } from '@/lib/format';

// Choices for the admin forms and filters.

export const levelOptions = (config: AppConfig): SelectOption<Level>[] =>
  config.levels.map((level) => ({ label: levelLabel(level), value: level }));

export const termOptions = (config: AppConfig): SelectOption<Term>[] =>
  config.terms.map((term) => ({ label: `Term ${term}`, value: term }));

/** The credit values the server knows (GET /config/credits/ can replace them). */
export const DEFAULT_CREDITS = ['CREDIT_1_00', 'CREDIT_1_50', 'CREDIT_2_00', 'CREDIT_3_00'];

export const creditOptions = (credits: string[]): SelectOption<string>[] =>
  credits.map((credit) => ({ label: `${formatCredits(credit)} credits`, value: credit }));

/** "2025-26" → "2026-27". Unknown shapes come back unchanged. */
export function nextSession(session: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(session.trim());
  if (!match) return session;
  const start = Number(match[1]) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** The session of today's academic year, e.g. "2026-27" (a year starts in July). */
export function currentSession(today = new Date()): string {
  const start = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/**
 * The semester after a level and term: Term I → Term II of the same level and session;
 * Term II → Term I of the next level, next session. Null after the last level.
 */
export function nextLevelTerm(
  config: AppConfig,
  level: Level,
  term: Term,
  session: string
): { level: Level; term: Term; session: string } | null {
  const termIndex = config.terms.indexOf(term);
  if (termIndex >= 0 && termIndex < config.terms.length - 1) {
    return { level, term: config.terms[termIndex + 1], session };
  }
  const levelIndex = config.levels.indexOf(level);
  const index = levelIndex >= 0 ? levelIndex : (levelNumber(level) ?? 0) - 1;
  if (index < 0 || index >= config.levels.length - 1) return null;
  return { level: config.levels[index + 1], term: config.terms[0] ?? 'I', session: nextSession(session) };
}

/** Normalises what people type for a session: "2025-2026" / "2025/26" → "2025-26". */
export function cleanSession(value: string): string {
  const match = /^\s*(\d{4})\s*[-/–]\s*(\d{2}|\d{4})\s*$/.exec(value);
  if (!match) return value.trim();
  return `${match[1]}-${match[2].slice(-2)}`;
}
