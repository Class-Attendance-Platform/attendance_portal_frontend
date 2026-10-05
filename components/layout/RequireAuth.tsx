import { Redirect, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/AuthContext';
import type { Role } from '@/lib/api/types';
import { homeFor, loginHref } from '@/lib/routes';

/** The current path with its query string (to come back here after signing in). */
export function useCurrentUrl(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments() as string[];
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}`;
  }
  // Phones: rebuild the query from the params that are not part of the path ([id] segments).
  const pathParams = new Set(
    segments.filter((segment) => segment.startsWith('[')).map((segment) => segment.replace(/^\[(\.\.\.)?|\]$/g, ''))
  );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (pathParams.has(key) || value === undefined) continue;
    query.set(key, Array.isArray(value) ? value[0] : String(value));
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Guards a group of pages. Signed out: to `/login?redirect=<here>`. Wrong role: to the user's
 * own home. Used by the route-group layouts in app/(app)/.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, isLoading, signedOut } = useAuth();
  const here = useCurrentUrl();
  if (isLoading) return <LoadingState fullScreen />;
  if (!user) return <Redirect href={signedOut ? '/login' : loginHref(here)} />;
  if (roles && !roles.includes(user.role)) return <Redirect href={homeFor(user.role)} />;
  return <>{children}</>;
}
