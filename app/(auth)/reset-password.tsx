import { Link, router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Link2Off, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, type TextInput } from 'react-native';

import { confirmProblem, FormHeading, newPasswordProblem, PASSWORD_RULES } from '@/components/auth/forms';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { PasswordField } from '@/components/ui/password-field';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import { authApi, AUTH_ERRORS } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

/** A finished state: an icon, a title, a line and one action. */
function Outcome({
  icon,
  tone,
  title,
  message,
  children,
}: {
  icon: LucideIcon;
  tone: 'primary' | 'absent';
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-5" role={tone === 'absent' ? 'alert' : 'status'}>
      <View className="items-center gap-3 pt-2">
        <View className={`h-12 w-12 items-center justify-center rounded-pill ${tone === 'absent' ? 'bg-absent-soft' : 'bg-primary-soft'}`}>
          <Icon as={icon} size={24} color={tone} />
        </View>
        <View className="items-center gap-1">
          <Text variant="title" align="center">
            {title}
          </Text>
          <Text tone="muted" align="center">
            {message}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

/** /reset-password?uid=&token= (the link in the reset email): choose a new password. */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ uid?: string; token?: string }>();
  const uid = first(params.uid);
  const token = first(params.token);

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [state, setState] = React.useState<'form' | 'done' | 'invalid'>(uid && token ? 'form' : 'invalid');
  const [submitting, setSubmitting] = React.useState(false);
  const confirmRef = React.useRef<TextInput>(null);
  const { user, logout } = useAuth();
  const [leaving, setLeaving] = React.useState(false);

  // This browser may still be signed in to another account (a shared lab PC): sign it out first,
  // so "Sign in" shows the form instead of that account's pages.
  async function goToSignIn() {
    setLeaving(true);
    try {
      if (user) await logout();
    } finally {
      setLeaving(false);
      router.replace('/login');
    }
  }

  async function submit() {
    if (submitting) return;
    const found = { password: newPasswordProblem(password), confirm: confirmProblem(password, confirm) };
    setErrors(found);
    setProblem(null);
    if (found.password || found.confirm) return;
    setSubmitting(true);
    try {
      await authApi.resetPassword({ uid, token, new_password: password });
      setState('done');
    } catch (error) {
      if (isApiError(error) && error.code === AUTH_ERRORS.invalidLink) {
        setState('invalid');
      } else if (isApiError(error) && error.field('new_password')) {
        setErrors({ password: error.field('new_password') });
      } else {
        setProblem(isApiError(error) ? error.message : 'Could not save the new password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
      <Card className="gap-5">
        {state === 'done' ? (
          <Outcome
            icon={CircleCheck}
            tone="primary"
            title="Password changed"
            message="You can sign in with your new password now."
          >
            <Text tone="muted">For safety, you were signed out on your other devices.</Text>
            <Button label="Sign in" variant="primary" fullWidth loading={leaving} onPress={goToSignIn} />
          </Outcome>
        ) : state === 'invalid' ? (
          <Outcome
            icon={Link2Off}
            tone="absent"
            title="This link does not work"
            message="This link is invalid or has expired. Reset links work once, for 1 day."
          >
            <Button
              label="Ask for a new link"
              variant="primary"
              fullWidth
              onPress={() => router.replace('/forgot-password')}
            />
            <View className="flex-row justify-center border-t border-border pt-4">
              <Link href="/login" asChild>
                <TextLink label="Back to sign in" />
              </Link>
            </View>
          </Outcome>
        ) : (
          <>
            <FormHeading title="Choose a new password" lead="You will sign in with it from now on." />
            {problem ? <Notice live tone="error" message={problem} /> : null}
            <View className="gap-4">
              <PasswordField
                label="New password"
                autoComplete="new-password"
                hint={PASSWORD_RULES}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                }}
                error={errors.password}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                disabled={submitting}
              />
              <PasswordField
                ref={confirmRef}
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChangeText={(text) => {
                  setConfirm(text);
                  if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined }));
                }}
                error={errors.confirm}
                returnKeyType="go"
                onSubmitEditing={submit}
                disabled={submitting}
              />
            </View>
            <Button
              label={submitting ? 'Saving…' : 'Save new password'}
              variant="primary"
              fullWidth
              loading={submitting}
              onPress={submit}
            />
            <View className="flex-row justify-center border-t border-border pt-4">
              <Link href="/login" asChild>
                <TextLink label="Back to sign in" />
              </Link>
            </View>
          </>
        )}
      </Card>
    </PublicPage>
  );
}
