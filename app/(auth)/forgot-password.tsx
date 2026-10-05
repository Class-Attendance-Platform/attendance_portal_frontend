import { Link, router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { emailProblem, FormHeading } from '@/components/auth/forms';
import { authHref, GuestOnly, useRedirectParam } from '@/components/auth/guest';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Notice, type NoticeProps } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { authApi, AUTH_ERRORS } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { configApi, DEFAULT_APP_CONFIG } from '@/lib/api/config';

type Problem = Pick<NoticeProps, 'tone' | 'title' | 'message'>;

/** /forgot-password: asks the server to email a reset link. Email may be off: then an admin helps. */
export default function ForgotPasswordScreen() {
  const redirect = useRedirectParam();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [sent, setSent] = React.useState<{ email: string; message: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  // The server says email reset is off: say so at once instead of a form that cannot work. (The
  // defaults also say "off", so only a real answer counts; the 503 below stays as a fallback.)
  const [emailOff, setEmailOff] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    void configApi.appCached().then((config) => {
      if (alive && config !== DEFAULT_APP_CONFIG && !config.email_reset_enabled) setEmailOff(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function submit() {
    if (submitting) return;
    const trimmed = email.trim();
    const found = emailProblem(trimmed);
    setError(found);
    setProblem(null);
    if (found) return;
    setSubmitting(true);
    try {
      const response = await authApi.forgotPassword(trimmed);
      setSent({ email: trimmed, message: response.message });
    } catch (caught) {
      if (isApiError(caught) && caught.code === AUTH_ERRORS.emailNotConfigured) {
        setProblem({
          tone: 'warn',
          title: 'Password reset by email is not set up',
          message: 'Ask an admin to reset your password.',
        });
      } else if (isApiError(caught) && caught.field('email')) {
        setError(caught.field('email'));
      } else {
        setProblem({ tone: 'error', message: isApiError(caught) ? caught.message : 'Could not send the link. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const backToSignIn = () => router.replace(authHref('/login', redirect));

  return (
    <GuestOnly>
      <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
        <Card className="gap-5">
          {sent ? (
            <>
              <View className="items-center gap-3 pt-2">
                <View className="h-12 w-12 items-center justify-center rounded-pill bg-primary-soft">
                  <Icon as={MailCheck} size={24} color="primary" />
                </View>
                <View className="items-center gap-1">
                  <Text variant="title" align="center">
                    Check your email
                  </Text>
                  <Text tone="muted" align="center">
                    {sent.message}
                  </Text>
                </View>
              </View>
              <View className="gap-0.5 rounded-control border border-border bg-bg px-3 py-2.5">
                <Text variant="small" tone="muted">
                  Sent to
                </Text>
                <Text weight="semibold" selectable>
                  {sent.email}
                </Text>
              </View>
              <Text tone="muted">
                The link works once, for 1 day. No email after a few minutes? Check your spam folder, or ask an admin to
                reset your password.
              </Text>
              <Button label="Back to sign in" variant="primary" fullWidth onPress={backToSignIn} />
            </>
          ) : emailOff ? (
            <>
              <FormHeading title="Forgot your password?" />
              <Notice
                tone="warn"
                title="Password reset by email is not set up"
                message="Ask an admin or the department office to reset your password. They give you a temporary one; change it after you sign in."
              />
              <Button label="Back to sign in" variant="primary" fullWidth onPress={backToSignIn} />
            </>
          ) : (
            <>
              <FormHeading
                title="Forgot your password?"
                lead="Enter the email of your account. We'll send you a link to choose a new password."
              />
              {problem ? <Notice live {...problem} /> : null}
              <TextField
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(undefined);
                }}
                error={error}
                placeholder="name@example.com"
                keyboardType="email-address"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="send"
                onSubmitEditing={submit}
                disabled={submitting}
              />
              <Button
                label={submitting ? 'Sending…' : 'Send reset link'}
                variant="primary"
                fullWidth
                loading={submitting}
                onPress={submit}
              />
              <View className="flex-row flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-4">
                <Text tone="muted">Remembered it?</Text>
                <Link href={authHref('/login', redirect)} asChild>
                  <TextLink label="Back to sign in" />
                </Link>
              </View>
            </>
          )}
        </Card>
      </PublicPage>
    </GuestOnly>
  );
}
