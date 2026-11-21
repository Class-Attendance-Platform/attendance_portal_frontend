import * as React from 'react';
import { View } from 'react-native';

import { formatPercent } from '@/lib/percent';
import { colors } from '@/lib/theme';

export type ProgressBarProps = {
  value: number | null | undefined;
  label: string;
  emptyText?: string;
  min?: number;
  thin?: boolean;
};

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
      aria-valuenow={known ? Math.floor(clamped + 1e-9) : undefined}
      aria-valuetext={known ? formatPercent(clamped) : emptyText}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: low ? colors.warn : colors.primary }} />
    </View>
  );
}
