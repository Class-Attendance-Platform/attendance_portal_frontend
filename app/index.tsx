import { Redirect } from 'expo-router';
import * as React from 'react';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/AuthContext';
import { homeFor } from '@/lib/routes';

/** `/`: the user's home, or the sign-in page. */
export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingState fullScreen />;
  return <Redirect href={user ? homeFor(user.role) : '/login'} />;
}
