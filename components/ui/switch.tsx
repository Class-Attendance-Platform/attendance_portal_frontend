import * as React from 'react';
import { Pressable, Switch as RNSwitch, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { describedBy } from './field';
import { spaceKey } from './keys';
import { Text } from './text';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** A second line under the label. */
  description?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
};

/** An accessible toggle switch. Works standalone or with an optional label and description. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  className,
}: SwitchProps) {
  const descriptionId = React.useId();
  const showDescription = !!description;
  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  if (!label) {
    return (
      <RNSwitch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint ?? description}
        accessibilityRole="switch"
        trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
        thumbColor={checked ? '#ffffff' : '#f8fafc'}
      />
    );
  }

  return (
    <Pressable
      role="switch"
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint ?? description}
      {...describedBy(descriptionId, showDescription)}
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={toggle}
      {...spaceKey(toggle, disabled)}
      className={cn(
        'min-h-[44px] flex-row items-center justify-between gap-3 rounded-control',
        disabled && 'opacity-60',
        FOCUS_RING,
        className
      )}
    >
      <View className="flex-1 pr-3">
        <Text weight="medium">{label}</Text>
        {description ? (
          <Text variant="small" tone="muted" nativeID={descriptionId} className="mt-0.5">
            {description}
          </Text>
        ) : null}
      </View>
      <RNSwitch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? description}
        trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
        thumbColor={checked ? '#ffffff' : '#f8fafc'}
      />
    </Pressable>
  );
}
