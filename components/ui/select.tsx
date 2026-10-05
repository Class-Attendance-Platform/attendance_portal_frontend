import { Check, ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Button } from './button';
import { Dialog } from './dialog';
import { controlBoxClass, describedBy, FieldFrame } from './field';
import { Icon } from './icon';
import { Text } from './text';

export type SelectOption<T extends string | number> = {
  label: string;
  value: T;
  /** A second line in the list. */
  description?: string;
};

export type SelectProps<T extends string | number> = {
  label: string;
  hideLabel?: boolean;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Looks like a text field; opens a dialog with the choices (works the same on web and phones). */
export function Select<T extends string | number>({
  label,
  hideLabel,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  hint,
  error,
  required,
  disabled,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const messageId = React.useId();
  const selected = options.find((option) => option.value === value);

  return (
    <FieldFrame
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      onLabelPress={() => !disabled && setOpen(true)}
      messageId={messageId}
      className={cn('gap-1.5', className)}
    >
      <Pressable
        role="button"
        accessibilityLabel={`${label}: ${selected ? selected.label : 'not chosen'}`}
        accessibilityHint={error ?? hint ?? 'Opens the list of choices'}
        {...describedBy(messageId, !!(error || hint))}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        aria-haspopup="dialog"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(controlBoxClass({ error: !!error, disabled }), 'justify-between gap-2 py-2 active:bg-bg web:hover:bg-bg', FOCUS_RING)}
      >
        <Text tone={selected ? 'default' : 'muted'} numberOfLines={1} className="flex-1">
          {selected ? selected.label : placeholder}
        </Text>
        <Icon as={ChevronDown} size={18} color="muted" />
      </Pressable>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        size="sm"
        actions={<Button label="Cancel" onPress={() => setOpen(false)} />}
      >
        <View role="radiogroup" accessibilityLabel={label} className="-mx-2">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                role="radio"
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                aria-checked={isSelected}
                accessibilityLabel={option.description ? `${option.label}, ${option.description}` : option.label}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'min-h-[48px] flex-row items-center gap-3 rounded-control px-3 py-2',
                  isSelected ? 'bg-primary-soft' : 'active:bg-bg web:hover:bg-bg',
                  FOCUS_RING
                )}
              >
                <View className="flex-1 gap-0.5">
                  <Text weight={isSelected ? 'semibold' : 'regular'} tone={isSelected ? 'primary' : 'default'}>
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text variant="small" tone="muted">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Icon as={Check} size={18} color="primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </FieldFrame>
  );
}
