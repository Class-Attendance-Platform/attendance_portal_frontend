import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { User } from './api/types';

export type StoredSession = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export const WEB_SESSION_KEY = 'portal_user';
const NATIVE_KEYS = { user: 'portal_user', accessToken: 'portal_access', refreshToken: 'portal_refresh' } as const;

const isWeb = Platform.OS === 'web';

let queue: Promise<void> = Promise.resolve();
function inOrder(task: () => Promise<void>, failure: string): Promise<void> {
  queue = queue.then(task).catch((e) => console.error(failure, e));
  return queue;
}

let generation = 0;
export const sessionGeneration = () => generation;
export function invalidateSession() {
  generation += 1;
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    if (isWeb) {
      const stored = localStorage.getItem(WEB_SESSION_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return {
        user: parsed?.user ?? null,
        accessToken: parsed?.accessToken ?? null,
        refreshToken: parsed?.refreshToken ?? null,
      };
    }
    const [user, accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(NATIVE_KEYS.user),
      SecureStore.getItemAsync(NATIVE_KEYS.accessToken),
      SecureStore.getItemAsync(NATIVE_KEYS.refreshToken),
    ]);
    return user ? { user: JSON.parse(user), accessToken, refreshToken } : null;
  } catch (e) {
    console.error('Failed to load the saved login.', e);
    if (isWeb) {
      try {
        localStorage.removeItem(WEB_SESSION_KEY);
      } catch {
      }
    }
    return null;
  }
}

function readWebEntry(): Record<string, unknown> {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEB_SESSION_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readWebTokens(): { userId: string | null; access: string | null; refresh: string | null } | null {
  if (!isWeb) return null;
  try {
    const stored = localStorage.getItem(WEB_SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      userId: parsed?.user?.id != null ? String(parsed.user.id) : null,
      access: parsed?.accessToken ?? null,
      refresh: parsed?.refreshToken ?? null,
    };
  } catch {
    return null;
  }
}

export function waitForWebSessionChange(ms: number): Promise<void> {
  if (!isWeb || typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('storage', onStorage);
      resolve();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WEB_SESSION_KEY || event.key === null) done();
    };
    const timer = setTimeout(done, ms);
    window.addEventListener('storage', onStorage);
  });
}

export function updateSession(
  changes: Partial<StoredSession>,
  { onlyIfSaved = false, userId }: { onlyIfSaved?: boolean; userId?: string | null } = {}
): Promise<void> {
  return inOrder(async () => {
    if (onlyIfSaved || userId) {
      const saved = (await loadSession())?.user as { id?: unknown } | null | undefined;
      if (onlyIfSaved && !saved) return;
      if (userId && saved?.id != null && String(saved.id) !== userId) return;
    }
    if (isWeb) {
      localStorage.setItem(WEB_SESSION_KEY, JSON.stringify({ ...readWebEntry(), ...changes }));
      return;
    }
    await Promise.all(
      (Object.keys(changes) as (keyof StoredSession)[]).map((key) => {
        const value = changes[key];
        if (value === null || value === undefined) return SecureStore.deleteItemAsync(NATIVE_KEYS[key]);
        return SecureStore.setItemAsync(NATIVE_KEYS[key], key === 'user' ? JSON.stringify(value) : (value as string));
      })
    );
  }, 'Failed to save the login.');
}

export function clearSession(): Promise<void> {
  invalidateSession();
  return inOrder(async () => {
    if (isWeb) {
      localStorage.removeItem(WEB_SESSION_KEY);
      return;
    }
    await Promise.all(Object.values(NATIVE_KEYS).map((key) => SecureStore.deleteItemAsync(key)));
  }, 'Failed to clear the saved login.');
}
