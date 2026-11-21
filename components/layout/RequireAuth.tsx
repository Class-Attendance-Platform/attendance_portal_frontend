import { Redirect, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/AuthContext';
import type { Role } from '@/lib/api/types';
import { homeFor, loginHref } from '@/lib/routes';

export function useCurrentUrl(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments() as string[];
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}`;
  }
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

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, isLoading, signedOut } = useAuth();
  const here = useCurrentUrl();
  if (isLoading) return <LoadingState fullScreen />;
  if (!user) return <Redirect href={signedOut ? '/login' : loginHref(here)} />;
  if (roles && !roles.includes(user.role)) return <Redirect href={homeFor(user.role)} />;
  return <>{children}</>;
}
