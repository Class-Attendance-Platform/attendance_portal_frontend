import { router } from 'expo-router';
import { Construction } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';

/** /teacher/live/[sessionId]: full-screen QR and code for the projector (no shell). */
export default function TeacherLiveScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center bg-bg px-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Card className="w-full max-w-[560px] gap-2">
        <Text variant="title">Live session</Text>
        <EmptyState
          icon={Construction}
          title="This screen is being rebuilt"
          message="The full-screen code for the projector is coming back soon in the new design."
          action={{ label: 'Back to my courses', variant: 'secondary', onPress: () => router.replace('/teacher') }}
        />
      </Card>
    </View>
  );
}
