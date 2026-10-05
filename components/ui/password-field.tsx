import { Eye, EyeOff } from 'lucide-react-native';
import * as React from 'react';
import type { TextInput } from 'react-native';

import { IconButton } from './button';
import { TextField, type TextFieldProps } from './text-field';

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'right'> & {
  /** "current-password" for sign-in, "new-password" when choosing one. */
  autoComplete?: 'current-password' | 'new-password' | 'password';
};

/** A password input with a show / hide button. */
export const PasswordField = React.forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { autoComplete = 'current-password', ...props },
  ref
) {
  const [visible, setVisible] = React.useState(false);
  return (
    <TextField
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
      right={
        <IconButton
          icon={visible ? EyeOff : Eye}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((value) => !value)}
        />
      }
      {...props}
    />
  );
});
