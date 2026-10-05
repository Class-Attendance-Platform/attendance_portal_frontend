import { router } from 'expo-router';
import { Hourglass } from 'lucide-react-native';
import * as React from 'react';

import { PublicPage } from '@/components/layout/PublicPage';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';

/** After sign-up (and for a sign-in before approval): the account waits for an admin. */
export default function PendingScreen() {
  return (
    <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
      <Card>
        <EmptyState
          icon={Hourglass}
          title="Waiting for approval"
          message="Your account was created. An admin from the department will approve it soon. You can sign in after that."
          action={{ label: 'Back to sign in', onPress: () => router.replace('/login'), variant: 'secondary' }}
        />
      </Card>
    </PublicPage>
  );
}
