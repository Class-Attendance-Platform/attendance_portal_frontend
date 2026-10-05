import { router } from 'expo-router';
import { Construction } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { PublicPage } from './PublicPage';

/** A public route whose screen is still being rebuilt (sign-up, password help). */
export function PublicPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
      <Card className="gap-2">
        <Text variant="title">{title}</Text>
        <View>
          <EmptyState
            icon={Construction}
            title="This screen is being rebuilt"
            message={note ?? 'It is coming back soon in the new design.'}
            action={{ label: 'Back to sign in', onPress: () => router.replace('/login'), variant: 'secondary' }}
          />
        </View>
      </Card>
    </PublicPage>
  );
}
