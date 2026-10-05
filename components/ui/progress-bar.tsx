import * as React from 'react';
import { View } from 'react-native';

import { colors } from '@/lib/theme';

export type ProgressBarProps = {
  /** 0–100; null shows an empty track (read as "No classes yet"). */
  value: number | null | undefined;
  /** Read by screen readers, e.g. "CSE 301 attendance". */
  label: string;
  /** Below this the bar turns orange (warn). Leave out for always green. */
  min?: number;
  /** 8 px (default) or 6 px for dense lists. */
  thin?: boolean;
};

/** A flat bar (no animation). Pair it with the number in words next to it. */
export function ProgressBar({ value, label, min, thin }: ProgressBarProps) {
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
      // No value (e.g. no classes held yet, shown as "—"): no number, not "0 percent".
      aria-valuenow={known ? Math.round(clamped) : undefined}
      aria-valuetext={known ? undefined : 'No classes yet'}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: low ? colors.warn : colors.primary }} />
    </View>
  );
}
