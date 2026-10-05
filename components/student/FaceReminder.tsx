import { Link } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

/** Shown on the home page while the student has not registered a face. */
export function FaceReminder() {
  const { isDesktop } = useBreakpoint();
  return (
    <Card className={cn('gap-3', isDesktop && 'flex-row flex-wrap items-center justify-between gap-4')}>
      <View className={cn('flex-row items-start gap-3', isDesktop && 'min-w-[320px] flex-1 items-center')}>
        <View className="h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
          <Icon as={ScanFace} size={22} color="primary" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text weight="semibold">Set up face attendance</Text>
          <Text variant="small" tone="muted">
            Your teacher can then mark you present from a class photo. It takes about a minute.
          </Text>
        </View>
      </View>
      <Link href="/student/face" asChild>
        <Button label="Register my face" icon={ScanFace} />
      </Link>
    </Card>
  );
}
