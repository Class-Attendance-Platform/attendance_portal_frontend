import { router, useLocalSearchParams } from 'expo-router';
import { Hourglass } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { authHref, GuestOnly, useRedirectParam } from '@/components/auth/guest';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const STEPS = [
  'An admin from the Department of CSE checks your details.',
  'When your account is approved, sign in with your email and password.',
  'If nothing happens for a few days, contact the department office.',
];

/**
 * After sign-up (`?created=1`) and after a sign-in before approval: the account waits for an
 * admin. Shows the email (`?email=`) and keeps `?redirect=` for the way back to sign in.
 */
export default function PendingScreen() {
  const params = useLocalSearchParams<{ email?: string; created?: string }>();
  const redirect = useRedirectParam();
  const email = typeof params.email === 'string' ? params.email.trim().slice(0, 150) : '';
  const created = params.created === '1';

  return (
    <GuestOnly>
      <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
        <Card className="gap-5">
          <View className="items-center gap-3 pt-2">
            <View className="h-12 w-12 items-center justify-center rounded-pill bg-warn-soft">
              <Icon as={Hourglass} size={24} color="warn" />
            </View>
            <View className="items-center gap-1">
              <Text variant="title" align="center">
                {created ? 'Account created' : 'Waiting for approval'}
              </Text>
              <Text tone="muted" align="center">
                {created
                  ? 'An admin must approve your account before you can sign in.'
                  : 'Your account is waiting for admin approval. You can sign in once it is approved.'}
              </Text>
            </View>
          </View>

          {email ? (
            <View className="gap-0.5 rounded-control border border-border bg-bg px-3 py-2.5">
              <Text variant="small" tone="muted">
                Account
              </Text>
              <Text weight="semibold" selectable>
                {email}
              </Text>
            </View>
          ) : null}

          <View className="gap-3">
            <Text variant="section">What happens next</Text>
            {STEPS.map((step, index) => (
              <View key={step} className="flex-row items-start gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-pill bg-primary-soft">
                  <Text variant="small" weight="bold" tone="primary">
                    {index + 1}
                  </Text>
                </View>
                <Text className="flex-1 pt-0.5">{step}</Text>
              </View>
            ))}
          </View>

          <Button
            label="Back to sign in"
            variant="primary"
            fullWidth
            onPress={() => router.replace(authHref('/login', redirect))}
          />
        </Card>
      </PublicPage>
    </GuestOnly>
  );
}
