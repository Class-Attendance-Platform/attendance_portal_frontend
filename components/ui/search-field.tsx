import { Search, X } from 'lucide-react-native';
import * as React from 'react';
import type { TextInput } from 'react-native';

import { IconButton } from './button';
import { Icon } from './icon';
import { TextField, type TextFieldProps } from './text-field';

export type SearchFieldProps = Omit<TextFieldProps, 'left' | 'right' | 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * A search box with a clear button. The label is hidden by default (the placeholder and the
 * screen reader label say what it searches); pass `hideLabel={false}` to show it.
 */
export const SearchField = React.forwardRef<TextInput, SearchFieldProps>(function SearchField(
  { value, onChangeText, hideLabel = true, placeholder, label, ...props },
  ref
) {
  return (
    <TextField
      ref={ref}
      label={label}
      hideLabel={hideLabel}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? label}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      inputMode="search"
      left={<Icon as={Search} size={18} color="muted" />}
      right={
        value ? <IconButton icon={X} accessibilityLabel="Clear search" onPress={() => onChangeText('')} /> : null
      }
      role="searchbox"
      {...props}
    />
  );
});
