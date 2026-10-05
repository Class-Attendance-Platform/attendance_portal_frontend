import { Check, X, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AttendanceStatus } from '@/lib/api/types';
import { colors, type ColorToken } from '@/lib/theme';
import { cn, FOCUS_RING } from '@/lib/utils';

export type Choice<T extends string | number> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Colours when chosen (default: primary green). */
  tone?: 'primary' | 'absent';
};

export type ChoiceGroupProps<T extends string | number> = {
  /** Read by screen readers, e.g. "Where is the class". */
  label: string;
  value: T | null;
  choices: Choice<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Shows a spinner on the chosen option (while it saves). */
  busy?: boolean;
  /** Stretch the options to fill the row. */
  fill?: boolean;
  className?: string;
};

const CHOSEN: Record<'primary' | 'absent', { box: string; ink: ColorToken }> = {
  primary: { box: 'border-primary bg-primary-soft', ink: 'primary' },
  absent: { box: 'border-absent bg-absent-soft', ink: 'absent' },
};

/**
 * A row of options where one is chosen (radio buttons that look like a segmented control).
 * Each option is at least 44 px tall. No animation.
 */
export function ChoiceGroup<T extends string | number>({
  label,
  value,
  choices,
  onChange,
  disabled,
  busy,
  fill,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <View role="radiogroup" accessibilityLabel={label} className={cn('flex-row flex-wrap gap-2', fill && 'flex-nowrap', className)}>
      {choices.map((choice) => {
        const chosen = choice.value === value;
        const style = CHOSEN[choice.tone ?? 'primary'];
        const ink: ColorToken = chosen ? style.ink : 'muted';
        return (
          <Pressable
            key={String(choice.value)}
            role="radio"
            aria-checked={chosen}
            accessibilityState={{ checked: chosen, selected: chosen, disabled: !!disabled }}
            accessibilityLabel={choice.label}
            disabled={disabled}
            onPress={() => {
              if (!chosen) onChange(choice.value);
            }}
            className={cn(
              'min-h-[44px] flex-row items-center justify-center gap-1.5 rounded-control border px-3.5',
              chosen ? style.box : 'border-border bg-surface web:hover:bg-bg active:bg-bg',
              fill && 'flex-1',
              disabled && !chosen && 'opacity-60',
              FOCUS_RING
            )}
          >
            {chosen && busy ? (
              <ActivityIndicator size="small" color={colors[ink]} />
            ) : choice.icon ? (
              <Icon as={choice.icon} size={16} color={ink} strokeWidth={chosen ? 2.5 : 2} />
            ) : null}
            <Text weight={chosen ? 'semibold' : 'medium'} style={{ color: colors[ink] }} numberOfLines={1}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const STATUS_CHOICES: Choice<AttendanceStatus>[] = [
  { value: 'PRESENT', label: 'Present', icon: Check, tone: 'primary' },
  { value: 'ABSENT', label: 'Absent', icon: X, tone: 'absent' },
];

export type AttendanceToggleProps = {
  /** The student's name: read as "Ayesha Rahman: Present". */
  name: string;
  value: AttendanceStatus | null;
  onChange: (value: AttendanceStatus) => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
};

/** Present / Absent for one student. */
export function AttendanceToggle({ name, value, onChange, disabled, busy, className }: AttendanceToggleProps) {
  return (
    <ChoiceGroup
      label={`${name}: attendance`}
      value={value}
      choices={STATUS_CHOICES}
      onChange={onChange}
      disabled={disabled || busy}
      busy={busy}
      className={cn('flex-nowrap', className)}
    />
  );
}
