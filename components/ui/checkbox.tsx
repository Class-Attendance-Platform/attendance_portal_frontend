import { Check } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { describedBy } from './field';
import { Icon } from './icon';
import { spaceKey } from './keys';
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

/** A 22 px box with its label; the whole row (at least 44 px tall) is the target. Space ticks it too. */
export function Checkbox({ checked, onChange, label, description, hideLabel, disabled, className }: CheckboxProps) {
  const descriptionId = React.useId();
  const showDescription = !!description && !hideLabel;
  return (
    <Pressable
      role="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      // Web: screen readers read the label only (the hint is for phones), so point at the second line.
      {...describedBy(descriptionId, showDescription)}
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      {...spaceKey(() => onChange(!checked), disabled)}
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
            <Text variant="small" tone="muted" nativeID={descriptionId}>
              {description}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
