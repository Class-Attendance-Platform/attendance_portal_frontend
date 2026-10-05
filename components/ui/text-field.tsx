import * as React from 'react';
import { Platform, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { colors, typeScale } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { controlBoxClass, FieldFrame } from './field';
import { useFontStyle } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'editable'> & {
  label: string;
  hideLabel?: boolean;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  /** Shown inside the box on the left / right (icons, buttons). */
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  inputStyle?: TextStyle;
};

// The browser's own focus outline is replaced by the 2 px green border.
const WEB_INPUT_RESET = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

/** A labelled text input with a hint or an error below it. */
export const TextField = React.forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hideLabel, hint, error, required, disabled, left, right, className, inputStyle, onFocus, onBlur, accessibilityLabel, ...props },
  forwardedRef
) {
  const inputRef = React.useRef<TextInput>(null);
  React.useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);
  const [focused, setFocused] = React.useState(false);
  const font = useFontStyle('regular');

  return (
    <FieldFrame
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      onLabelPress={() => inputRef.current?.focus()}
      className={cn('gap-1.5', className)}
    >
      <View className={controlBoxClass({ focused, error: !!error, disabled })}>
        {left ? <View className="mr-2">{left}</View> : null}
        <TextInput
          ref={inputRef}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? hint ?? undefined}
          aria-invalid={!!error}
          aria-required={required}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            { flex: 1, minHeight: 40, paddingVertical: 8, color: colors.text, ...typeScale.body, ...font },
            WEB_INPUT_RESET,
            inputStyle,
          ]}
          {...props}
        />
        {right ? <View className="-my-1 -mr-2 ml-1">{right}</View> : null}
      </View>
    </FieldFrame>
  );
});
