import { router } from 'expo-router';
import { MapPinOff } from 'lucide-react-native';
import * as React from 'react';

import { PublicPage } from '@/components/layout/PublicPage';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';

export default function NotFoundScreen() {
  return (
    <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
      <Card>
        <EmptyState
          icon={MapPinOff}
          title="Page not found"
          message="This page does not exist or has moved."
          action={{ label: 'Go to the start page', onPress: () => router.replace('/') }}
        />
      </Card>
    </PublicPage>
  );
}
