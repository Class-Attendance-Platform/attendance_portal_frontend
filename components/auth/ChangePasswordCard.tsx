import * as React from 'react';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { PasswordField } from '@/components/ui/password-field';
import { Text } from '@/components/ui/text';
import { authApi, AUTH_ERRORS } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { confirmProblem, newPasswordProblem, PASSWORD_RULES } from './forms';

type Errors = { current?: string; next?: string; confirm?: string };

/**
 * POST /auth/password/change/. The server signs out the other devices and sends a new token pair,
 * which authApi.changePassword saves, so this device stays signed in.
 */
export function ChangePasswordCard() {
  const message = useMessage();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [errors, setErrors] = React.useState<Errors>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const nextRef = React.useRef<TextInput>(null);
  const confirmRef = React.useRef<TextInput>(null);

  const clearError = (name: keyof Errors) => {
    if (errors[name]) setErrors((value) => ({ ...value, [name]: undefined }));
  };

  async function submit() {
    if (saving) return;
    const found: Errors = {
      current: current ? undefined : 'Enter your current password.',
      next: newPasswordProblem(next),
      confirm: confirmProblem(next, confirm),
    };
    if (!found.next && current && next === current) found.next = 'Choose a password that is different from the current one.';
    setErrors(found);
    setProblem(null);
    if (found.current || found.next || found.confirm) return;

    setSaving(true);
    try {
      await authApi.changePassword({ current_password: current, new_password: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      message.success('Password changed. Your other devices were signed out.');
    } catch (error) {
      if (isApiError(error) && error.code === AUTH_ERRORS.wrongPassword) {
        setErrors({ current: error.message });
      } else if (isApiError(error) && (error.field('new_password') || error.field('current_password'))) {
        setErrors({ current: error.field('current_password'), next: error.field('new_password') });
      } else {
        setProblem(isApiError(error) ? error.message : 'Could not change the password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Change password" className="gap-4">
      <Text tone="muted">You stay signed in on this device. Other devices are signed out.</Text>
      <View className="gap-4">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChangeText={(text) => {
            setCurrent(text);
            clearError('current');
          }}
          error={errors.current}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextRef.current?.focus()}
          disabled={saving}
        />
        <PasswordField
          ref={nextRef}
          label="New password"
          autoComplete="new-password"
          hint={PASSWORD_RULES}
          value={next}
          onChangeText={(text) => {
            setNext(text);
            clearError('next');
          }}
          error={errors.next}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
          disabled={saving}
        />
        <PasswordField
          ref={confirmRef}
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            clearError('confirm');
          }}
          error={errors.confirm}
          returnKeyType="go"
          onSubmitEditing={submit}
          disabled={saving}
        />
      </View>
      {problem ? <Notice live tone="error" message={problem} /> : null}
      <Button label={saving ? 'Saving…' : 'Change password'} variant="primary" loading={saving} onPress={submit} />
    </Card>
  );
}
