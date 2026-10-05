import * as React from 'react';
import { View } from 'react-native';

import { colors } from '@/lib/theme';

export type ProgressBarProps = {
  /** 0–100; null shows an empty track. */
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
  const clamped = value === null || value === undefined || Number.isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  const low = min !== undefined && value !== null && value !== undefined && value < min;
  const height = thin ? 6 : 8;
  return (
    <View
      role="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: low ? colors.warn : colors.primary }} />
    </View>
  );
}
