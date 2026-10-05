import { KeyRound, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button, Dialog, IconButton, Notice, Text, TextField, useMessage } from '@/components/ui';
import { adminApi, type ApiError, type UUID } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { makeTemporaryPassword } from './files';
import { fieldError, FormError } from './parts';

/** A visible password field with a button that makes a new random one. */
export function TemporaryPasswordField({
  value,
  onChange,
  error,
  label = 'Temporary password',
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="off"
      error={error}
      hint={error ? undefined : 'At least 8 characters, not only digits. Give it to them privately.'}
      right={<IconButton icon={RefreshCw} accessibilityLabel="Make a new random password" onPress={() => onChange(makeTemporaryPassword())} />}
      inputStyle={{ fontVariant: ['tabular-nums'] }}
    />
  );
}

/** The password, once, after it was set: so the admin can hand it over. */
export function PasswordHandover({ email, password, note }: { email: string; password: string; note?: string }) {
  return (
    <View className="gap-3">
      <View className="gap-2 rounded-control border border-border bg-bg p-3">
        <View className="gap-0.5">
          <Text variant="small" tone="muted">
            Email
          </Text>
          <Text weight="semibold" selectable>
            {email}
          </Text>
        </View>
        <View className="gap-0.5">
          <Text variant="small" tone="muted">
            Temporary password
          </Text>
          <Text weight="bold" selectable tabular style={{ fontSize: 20, lineHeight: 28, letterSpacing: 1 }}>
            {password}
          </Text>
        </View>
      </View>
      <Notice
        tone="warn"
        message={note ?? 'Give this password to them privately (not in a group chat). It is not shown again. They can change it under Account.'}
      />
    </View>
  );
}

/** Admin reset of someone's password: a temporary password, then the handover. */
export function ResetPasswordDialog({
  person,
  onClose,
}: {
  /** Open while set. */
  person: { userId: UUID; name: string; email: string } | null;
  onClose: () => void;
}) {
  const message = useMessage();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<ApiError | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const personId = person?.userId;
  React.useEffect(() => {
    if (personId) {
      setPassword(makeTemporaryPassword());
      setError(null);
      setDone(false);
    }
  }, [personId]);

  async function save() {
    if (!person) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.resetPassword(person.userId, password.trim());
      setDone(true);
      message.success(`Password reset for ${person.name}. They were signed out everywhere.`);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const passwordError = fieldError(error, 'new_password', 'password');
  return (
    <Dialog
      open={!!person}
      onClose={onClose}
      title={done ? 'New password set' : 'Reset password'}
      description={
        done ? undefined : `${person?.name ?? ''} gets this temporary password and is signed out on every device.`
      }
      size="sm"
      dismissable={!saving}
      actions={
        done ? (
          <Button label="Done" variant="primary" onPress={onClose} />
        ) : (
          <>
            <Button label="Cancel" onPress={onClose} disabled={saving} />
            <Button label="Reset password" variant="primary" icon={KeyRound} loading={saving} onPress={save} disabled={!password.trim()} />
          </>
        )
      }
    >
      {done && person ? (
        <PasswordHandover email={person.email} password={password.trim()} />
      ) : (
        <View className="gap-4">
          <TemporaryPasswordField value={password} onChange={setPassword} error={passwordError} />
          {passwordError ? null : <FormError error={error} />}
        </View>
      )}
    </Dialog>
  );
}
