import * as React from 'react';
import { View } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { Text } from './text';

export type StatTileProps = {
  label: string;
  value: string;
  /** A line under the value, e.g. "of 42 students". */
  hint?: string;
  /** warn: the number needs attention (e.g. students below 75%); the label says why. */
  tone?: 'default' | 'warn';
  className?: string;
};

/** One number with a label, for summary rows. */
export function StatTile({ label, value, hint, tone = 'default', className }: StatTileProps) {
  const { isDesktop } = useBreakpoint();
  const warn = tone === 'warn';
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      className={cn(
        'min-w-[140px] flex-1 gap-1 border p-4',
        isDesktop ? 'rounded-card' : 'rounded-card-phone',
        warn ? 'border-warn-border bg-warn-soft' : 'border-border bg-surface',
        className
      )}
    >
      <Text variant="small" tone={warn ? 'warnInk' : 'muted'}>
        {label}
      </Text>
      <Text variant="stat" tone={warn ? 'warn' : 'default'} tabular>
        {value}
      </Text>
      {hint ? (
        <Text variant="small" tone={warn ? 'warnInk' : 'muted'}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
