import { Stack } from 'expo-router';
import * as React from 'react';

import { RequireAuth } from '@/components/layout/RequireAuth';
import { colors } from '@/lib/theme';

/** /teacher/*: teachers only (others go to their own home). */
export default function TeacherLayout() {
  return (
    <RequireAuth roles={['TEACHER']}>
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
    </RequireAuth>
  );
}
