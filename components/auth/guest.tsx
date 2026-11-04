import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/AuthContext';
import { homeFor, safeRedirect } from '@/lib/routes';

/** The `?redirect=` of a sign-in page, if it is a safe path inside the app. */
export function useRedirectParam(): string | null {
  const params = useLocalSearchParams<{ redirect?: string }>();
  return safeRedirect(params.redirect);
}

/**
 * A sign-in page's link to another one, keeping `?redirect=` (and extra params), so someone who
 * signs up from a check-in link comes back to it after signing in.
 */
export function authHref(path: string, redirect: string | null, extra?: Record<string, string | undefined>): Href {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(extra ?? {})) if (value) query.set(key, value);
  if (redirect) query.set('redirect', redirect);
  const search = query.toString();
  return (search ? `${path}?${search}` : path) as Href;
}

/** Pages for signed-out people (sign-up, password help): a signed-in user goes to their home. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const redirect = useRedirectParam();
  if (isLoading) return <LoadingState fullScreen />;
  if (user) return <Redirect href={(redirect ?? homeFor(user.role)) as Href} />;
  return <>{children}</>;
}
