import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** The saved login: user profile plus the two tokens. */
export type StoredSession = {
  user: any;
  accessToken: string | null;
  refreshToken: string | null;
};

// Web: one localStorage entry (shared by tabs). Phones: the encrypted secure store,
// one key per part because each value must stay under 2 KB.
const WEB_KEY = 'portal_user';
const NATIVE_KEYS = { user: 'portal_user', accessToken: 'portal_access', refreshToken: 'portal_refresh' } as const;

const isWeb = Platform.OS === 'web';

export async function loadSession(): Promise<StoredSession | null> {
  try {
    if (isWeb) {
      const stored = localStorage.getItem(WEB_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return {
        user: parsed?.user ?? parsed, // older builds stored the user object alone
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

/** Saves the parts given and keeps the rest (e.g. new tokens after a refresh). */
export async function updateSession(changes: Partial<StoredSession>): Promise<void> {
  try {
    if (isWeb) {
      const current = JSON.parse(localStorage.getItem(WEB_KEY) || '{}');
      localStorage.setItem(WEB_KEY, JSON.stringify({ ...current, ...changes }));
      return;
    }
    await Promise.all(
      (Object.keys(changes) as (keyof StoredSession)[]).map((key) => {
        const value = changes[key];
        if (value === null || value === undefined) return SecureStore.deleteItemAsync(NATIVE_KEYS[key]);
        return SecureStore.setItemAsync(NATIVE_KEYS[key], key === 'user' ? JSON.stringify(value) : value);
      })
    );
  } catch (e) {
    console.error('Failed to save the login.', e);
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(WEB_KEY);
      return;
    }
    await Promise.all(Object.values(NATIVE_KEYS).map((key) => SecureStore.deleteItemAsync(key)));
  } catch (e) {
    console.error('Failed to clear the saved login.', e);
  }
}
