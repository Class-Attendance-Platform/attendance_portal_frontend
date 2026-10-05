import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { User } from './api/types';

/** The saved login: user profile plus the two tokens. */
export type StoredSession = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
};

// Web: one localStorage entry (shared by tabs). Phones: the encrypted secure store,
// one key per part because each value must stay under 2 KB.
export const WEB_SESSION_KEY = 'portal_user';
const NATIVE_KEYS = { user: 'portal_user', accessToken: 'portal_access', refreshToken: 'portal_refresh' } as const;

const isWeb = Platform.OS === 'web';

// Saves and deletes run one at a time, so a logout never interleaves with a save that started
// before it (phones write each key separately and asynchronously).
let queue: Promise<void> = Promise.resolve();
function inOrder(task: () => Promise<void>, failure: string): Promise<void> {
  queue = queue.then(task).catch((e) => console.error(failure, e));
  return queue;
}

// Changes on every sign-out (here or, on the web, in another tab), so slow work that started
// before it can tell and drop its result.
let generation = 0;
export const sessionGeneration = () => generation;
/** Marks the end of this tab's login without touching the saved one (sign-out in another tab). */
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
    return null;
  }
}

/**
 * Web only: the saved login's tokens and user id, as the newest tab left them (another tab may
 * have rotated the tokens or signed in as someone else). Phones have one app instance: null there.
 */
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

/** Web only: resolves when another tab changes the saved login, or after `ms`. Phones: at once. */
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

/**
 * Saves the parts given and keeps the rest (e.g. new tokens after a refresh).
 * `onlyIfSaved`: skip it when no login is saved any more (the user logged out meanwhile).
 * `userId`: skip it when the saved login is another user's (web: signed in in another tab).
 */
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
      const current = JSON.parse(localStorage.getItem(WEB_SESSION_KEY) || '{}');
      localStorage.setItem(WEB_SESSION_KEY, JSON.stringify({ ...current, ...changes }));
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
