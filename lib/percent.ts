// Percent shown to people. Pure (no imports) so tests/format.test.mjs can run it in Node.

/**
 * "86%". Null (no classes yet) shows "—". Rounds **down**, never up: 74.5 shows "74%", not "75%",
 * so a value under the minimum (the server compares exact counts) never reads as the minimum next
 * to "Below 75%".
 */
export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const factor = 10 ** digits;
  // The small epsilon stops float error from turning e.g. 58.0 (57.99999…) into 57.
  return `${(Math.floor(value * factor + 1e-9) / factor).toFixed(digits)}%`;
}
