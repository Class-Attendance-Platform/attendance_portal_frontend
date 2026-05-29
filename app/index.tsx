import { useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Screen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/(auth)/login');
    } else {
      if (user.role === 'ADMIN') {
        router.replace('/dashboard/admin/courses');
      } else if (user.role === 'TEACHER') {
        router.replace('/dashboard/teacher');
      } else if (user.role === 'STUDENT') {
        router.replace('/dashboard/student');
      }
    }
  }, [user, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" />
    </View>
  );
}