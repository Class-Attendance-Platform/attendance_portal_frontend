export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const factor = 10 ** digits;
  return `${(Math.floor(value * factor + 1e-9) / factor).toFixed(digits)}%`;
}
