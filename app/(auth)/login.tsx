import { Link, Redirect, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';
import { View, type TextInput } from 'react-native';

import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice, type NoticeProps } from '@/components/ui/notice';
import { PasswordField } from '@/components/ui/password-field';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import { AUTH_ERRORS } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { homeFor, safeRedirect } from '@/lib/routes';

type Problem = Pick<NoticeProps, 'tone' | 'title' | 'message'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What to show for a failed sign-in. The server's message is already readable. */
function problemFor(error: unknown): Problem {
  if (!isApiError(error)) return { tone: 'error', message: 'Could not sign in. Please try again.' };
  switch (error.code) {
    case AUTH_ERRORS.pendingApproval:
      return {
        tone: 'warn',
        title: 'Waiting for approval',
        message: error.message || 'Your account is waiting for admin approval.',
      };
    case AUTH_ERRORS.accountDisabled:
      return {
        tone: 'error',
        title: 'Account disabled',
        message: error.message || 'This account has been disabled. Contact the department office.',
      };
    case AUTH_ERRORS.invalidCredentials:
      return { tone: 'error', message: error.message || 'Email or password is incorrect.' };
    default:
      return { tone: 'error', message: error.message };
  }
}

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = safeRedirect(params.redirect);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const passwordRef = React.useRef<TextInput>(null);

  if (isLoading) return <LoadingState fullScreen />;
  // Signed in (already, or just now): go on to where the user was going.
  if (user) return <Redirect href={(redirect ?? homeFor(user.role)) as Href} />;

  async function submit() {
    if (submitting) return;
    const trimmed = email.trim();
    const nextErrors: typeof errors = {};
    if (!trimmed) nextErrors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(trimmed)) nextErrors.email = 'Enter a valid email address, like name@example.com.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    setProblem(null);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    try {
      await login(trimmed, password);
      // The redirect above runs on the next render.
    } catch (error) {
      if (isApiError(error) && (error.field('email') || error.field('password'))) {
        setErrors({ email: error.field('email'), password: error.field('password') });
      } else {
        setProblem(problemFor(error));
      }
      setSubmitting(false);
    }
  }

  const checkingIn = redirect?.startsWith('/check-in') || redirect?.startsWith('/student/check-in');

  return (
    <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
      <Card className="gap-5">
        <View className="gap-1">
          <Text variant="title">Sign in</Text>
          <Text tone="muted">Use the email address of your portal account.</Text>
        </View>

        {checkingIn && !problem ? <Notice tone="info" message="Sign in to check in to your class." /> : null}
        {problem ? <Notice live {...problem} /> : null}

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="name@example.com"
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            disabled={submitting}
          />
          <View className="gap-2">
            <PasswordField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              returnKeyType="go"
              onSubmitEditing={submit}
              disabled={submitting}
            />
            <View className="items-end">
              <Link href="/forgot-password" asChild>
                <TextLink label="Forgot password?" small />
              </Link>
            </View>
          </View>
        </View>

        <Button
          label={submitting ? 'Signing in…' : 'Sign in'}
          variant="primary"
          fullWidth
          loading={submitting}
          onPress={submit}
        />

        <View className="flex-row flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-4">
          <Text tone="muted">New to the portal?</Text>
          <Link href="/register" asChild>
            <TextLink label="Create an account" />
          </Link>
        </View>
      </Card>
    </PublicPage>
  );
}
