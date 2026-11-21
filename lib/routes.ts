import type { Href } from 'expo-router';

import type { Role } from './api/types';

export const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  ADMIN: '/admin',
};

export function homeFor(role: Role | null | undefined): Href {
  return ((role && HOME_BY_ROLE[role]) || '/login') as Href;
}

export function safeRedirect(raw: string | string[] | null | undefined): string | null {
  let value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    if (/%2f/i.test(value)) value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /^\/*[a-z][a-z0-9+.-]*:/i.test(value)) {
    return null;
  }
  if (/^\/(login|register|pending|forgot-password|reset-password)(\/|\?|$)/.test(value)) return null;
  return value;
}

export function loginHref(redirectTo?: string | null): Href {
  const target = safeRedirect(redirectTo);
  return (target && target !== '/' ? `/login?redirect=${encodeURIComponent(target)}` : '/login') as Href;
}
