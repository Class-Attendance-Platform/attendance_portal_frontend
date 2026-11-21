import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/AuthContext';
import { homeFor, safeRedirect } from '@/lib/routes';

export function useRedirectParam(): string | null {
  const params = useLocalSearchParams<{ redirect?: string }>();
  return safeRedirect(params.redirect);
}

export function authHref(path: string, redirect: string | null, extra?: Record<string, string | undefined>): Href {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(extra ?? {})) if (value) query.set(key, value);
  if (redirect) query.set('redirect', redirect);
  const search = query.toString();
  return (search ? `${path}?${search}` : path) as Href;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const redirect = useRedirectParam();
  if (isLoading) return <LoadingState fullScreen />;
  if (user) return <Redirect href={(redirect ?? homeFor(user.role)) as Href} />;
  return <>{children}</>;
}
