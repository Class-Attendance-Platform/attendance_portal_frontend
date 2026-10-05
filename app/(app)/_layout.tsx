import { Stack } from 'expo-router';
import * as React from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { colors } from '@/lib/theme';

/** Every signed-in page: the guard (signed out → /login?redirect=…), then the shell. */
export default function SignedInLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
      </AppShell>
    </RequireAuth>
  );
}
