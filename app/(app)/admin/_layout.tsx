import { Stack } from 'expo-router';
import * as React from 'react';

import { RequireAuth } from '@/components/layout/RequireAuth';
import { colors } from '@/lib/theme';

export default function AdminLayout() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
    </RequireAuth>
  );
}
