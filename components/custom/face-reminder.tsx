import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { faceService } from '@/lib/services';

/**
 * Student dashboard card: asks the student to register their face, or (once
 * registered) offers a small "Manage" link to register again or delete it.
 */
export function FaceReminder({ className = '' }: { className?: string }) {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);

  // Re-check whenever the dashboard is shown again (e.g. back from registering).
  useFocusEffect(
    useCallback(() => {
      faceService
        .getMine()
        .then((res) => setRegistered(res.success ? !!res.registered : null))
        .catch(() => setRegistered(null));
    }, [])
  );

  if (registered === null) return null;

  if (registered) {
    return (
      <View className={`flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 ${className}`}>
        <ScanFace size={18} color="#047857" />
        <Text className="flex-1 text-sm text-foreground">Face attendance is set up</Text>
        <Button variant="outline" size="sm" className="rounded-xl" onPress={() => router.push('/face/register')}>
          <Text className="text-xs font-semibold">Manage</Text>
        </Button>
      </View>
    );
  }

  if (hidden) return null;

  return (
    <View className={`gap-3 rounded-2xl border border-border bg-card p-4 ${className}`}>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <ScanFace size={22} color="#171717" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-bold text-foreground">Set up face attendance</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Your teacher can mark you present from one class photo. Registering takes about 10 seconds.
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Button className="flex-1 rounded-xl" onPress={() => router.push('/face/register')}>
          <Text className="font-semibold">Register my face</Text>
        </Button>
        <Button variant="outline" className="rounded-xl" onPress={() => setHidden(true)}>
          <Text className="font-semibold">Later</Text>
        </Button>
      </View>
    </View>
  );
}
