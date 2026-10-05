import { Check } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** A second line under the label. */
  description?: string;
  /** Hide the label visually (e.g. in a table row that already shows the name). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
};

/** A 22 px box with its label; the whole row (at least 44 px tall) is the target. */
export function Checkbox({ checked, onChange, label, description, hideLabel, disabled, className }: CheckboxProps) {
  return (
    <Pressable
      role="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={cn(
        'min-h-[44px] flex-row items-center gap-3 rounded-control',
        hideLabel ? 'min-w-[44px] justify-center' : 'self-start pr-2',
        disabled && 'opacity-60',
        FOCUS_RING,
        className
      )}
    >
      <View
        className={cn(
          'h-[22px] w-[22px] items-center justify-center rounded-[6px] border-2',
          checked ? 'border-primary bg-primary' : 'border-muted bg-surface'
        )}
      >
        {checked ? <Icon as={Check} size={16} color="white" strokeWidth={3} /> : null}
      </View>
      {hideLabel ? null : (
        <View className="flex-shrink gap-0.5">
          <Text>{label}</Text>
          {description ? (
            <Text variant="small" tone="muted">
              {description}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
