import * as React from 'react';
import { View } from 'react-native';

import { formatPercent } from '@/lib/percent';
import { colors } from '@/lib/theme';

export type ProgressBarProps = {
  /** 0–100; null shows an empty track (read as `emptyText`). */
  value: number | null | undefined;
  /** Read by screen readers, e.g. "CSE 301 attendance". */
  label: string;
  /** Read instead of a number when there is no value. Default "No classes yet". */
  emptyText?: string;
  /** Below this the bar turns orange (warn). Leave out for always green. */
  min?: number;
  /** 8 px (default) or 6 px for dense lists. */
  thin?: boolean;
};

/** A flat bar (no animation). Pair it with the number in words next to it. */
export function ProgressBar({ value, label, emptyText = 'No classes yet', min, thin }: ProgressBarProps) {
  const known = value !== null && value !== undefined && !Number.isNaN(value);
  const clamped = known ? Math.max(0, Math.min(100, value)) : 0;
  const low = known && min !== undefined && value < min;
  const height = thin ? 6 : 8;
  return (
    <View
      role="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      // Rounded down like every percent on screen (74.5 is read as 74, never 75). No value (e.g.
      // no classes held yet, shown as "—"): no number, not "0 percent".
      aria-valuenow={known ? Math.floor(clamped + 1e-9) : undefined}
      aria-valuetext={known ? formatPercent(clamped) : emptyText}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: low ? colors.warn : colors.primary }} />
    </View>
  );
}
