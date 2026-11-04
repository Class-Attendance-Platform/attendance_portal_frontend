import { Check, Minus, X, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import type { AttendanceStatus } from '@/lib/api/types';
import { colors, type ColorToken } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type PillTone = 'neutral' | 'primary' | 'present' | 'absent' | 'warn' | 'info';

const TONES: Record<PillTone, { bg: string; ink: ColorToken; border?: string }> = {
  neutral: { bg: 'bg-bg', ink: 'muted', border: 'border-border' },
  primary: { bg: 'bg-primary-soft', ink: 'primary' },
  // Present text uses the darker primary green on the soft background (AA contrast).
  present: { bg: 'bg-primary-soft', ink: 'primary' },
  absent: { bg: 'bg-absent-soft', ink: 'absent' },
  warn: { bg: 'bg-warn-soft', ink: 'warnInk', border: 'border-warn-border' },
  info: { bg: 'bg-info-soft', ink: 'info' },
};

export type PillProps = {
  label: string;
  tone?: PillTone;
  /** A small dot before the label (e.g. "Live"). */
  dot?: boolean;
  icon?: LucideIcon;
  className?: string;
};

/** A small rounded label. Always has words: colour is never the only signal. */
export function Pill({ label, tone = 'neutral', dot, icon, className }: PillProps) {
  const style = TONES[tone];
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 self-start rounded-pill px-2.5 py-1',
        style.bg,
        style.border ? `border ${style.border}` : 'border border-transparent',
        className
      )}
    >
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[style.ink] }} /> : null}
      {icon ? <Icon as={icon} size={14} color={style.ink} strokeWidth={2.5} /> : null}
      <Text variant="small" weight="semibold" style={{ color: colors[style.ink] }}>
        {label}
      </Text>
    </View>
  );
}

export type StatusPillProps = {
  /** PRESENT, ABSENT, or null (not enrolled yet / no record). */
  status: AttendanceStatus | null | undefined;
  /** Text for null. Default "Not enrolled". */
  emptyLabel?: string;
  className?: string;
};

/** Present / Absent with an icon and a word. */
export function StatusPill({ status, emptyLabel = 'Not enrolled', className }: StatusPillProps) {
  if (status === 'PRESENT') return <Pill label="Present" tone="present" icon={Check} className={className} />;
  if (status === 'ABSENT') return <Pill label="Absent" tone="absent" icon={X} className={className} />;
  return <Pill label={emptyLabel} tone="neutral" icon={Minus} className={className} />;
}
