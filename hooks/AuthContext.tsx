import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useMessage } from '@/components/ui/message-bar';
import { authApi } from '@/lib/api/auth';
import { getAccessToken, getRefreshToken, isApiError, setSessionExpiredHandler, setTokens } from '@/lib/api/client';
import type { Role, User } from '@/lib/api/types';
import { clearSession, loadSession, sessionGeneration, updateSession, WEB_SESSION_KEY } from '@/lib/session';

export type { Role as UserRole, User } from '@/lib/api/types';

interface AuthContextType {
  user: User | null;
  /** True until the saved login has been read at start-up. */
  isLoading: boolean;
  /** True after the user signed out on purpose (guards then skip the `?redirect=`). */
  signedOut: boolean;
  /**
   * Signs in. Rejects with an ApiError: `code` "invalid_credentials", "pending_approval" (no
   * tokens until an admin approves) or "account_disabled"; `message` is ready to show.
   */
  login: (email: string, password: string) => Promise<User>;
  /** Signs out here and blacklists the refresh token on the server (in the background). */
  logout: () => Promise<void>;
  /** Reloads the user from GET /auth/me/. */
  refreshUser: () => Promise<User | null>;
  /** Replaces the user after an update (e.g. PATCH /auth/me/). */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];

/** Accepts users saved by older builds too (role case, missing fields). */
function normaliseUser(raw: any): User | null {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const role = String(raw.role ?? '').toUpperCase() as Role;
  if (!ROLES.includes(role)) return null;
  return {
    id: String(raw.id),
    userName: raw.userName ?? '',
    first_name: raw.first_name ?? '',
    last_name: raw.last_name ?? '',
    email: raw.email ?? '',
    role,
    is_verified: raw.is_verified ?? true,
    date_joined: raw.date_joined ?? '',
    student_profile: raw.student_profile ?? null,
    teacher_profile: raw.teacher_profile ?? null,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const message = useMessage();
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  /** Forgets the login on this device (no server call). */
  const forget = useCallback(() => {
    setUserState(null);
    setTokens(null, null);
    return clearSession();
  }, []);

  const startSession = useCallback((rawUser: unknown, access: string | null, refresh: string | null) => {
    const signedIn = normaliseUser(rawUser);
    if (!signedIn) throw new Error('The server sent an unexpected answer. Please try again.');
    setTokens(access, refresh);
    setUserState(signedIn);
    updateSession({ user: signedIn, accessToken: access, refreshToken: refresh });
    return signedIn;
  }, []);

  const refreshUser = useCallback(async () => {
    const generation = sessionGeneration();
    const response = await authApi.me();
    if (generation !== sessionGeneration()) return null; // signed out meanwhile
    const fresh = normaliseUser(response.user);
    if (!fresh) return null;
    setUserState(fresh);
    // Save only the profile: the tokens may have been refreshed (rotated) meanwhile.
    await updateSession({ user: fresh }, { onlyIfSaved: true });
    return fresh;
  }, []);

  // Restore the saved login at start-up, then refresh the profile in the background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      const savedUser = normaliseUser(stored?.user);
      if (cancelled) return;
      if (!savedUser || !stored?.refreshToken) {
        if (stored) clearSession();
        setIsLoading(false);
        return;
      }
      setTokens(stored.accessToken, stored.refreshToken);
      setUserState(savedUser);
      // Open the app now; the profile refresh can be slow on a bad connection.
      setIsLoading(false);
      refreshUser().catch((error) => {
        if (!isApiError(error) || error.status !== 0) console.warn('Could not refresh the profile.', error);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  // The server no longer accepts this login (e.g. not used for a long time): sign out here.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!userRef.current) return;
      forget();
      message.info('Your sign-in has expired. Please sign in again.');
    });
    return () => setSessionExpiredHandler(null);
  }, [forget, message]);

  // Web: signing out in another tab signs out this one too.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === WEB_SESSION_KEY && event.newValue === null && userRef.current) {
        setUserState(null);
        setTokens(null, null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      setSignedOut(false);
      return startSession(response.user, response.access ?? null, response.refresh ?? null);
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    const tokens = { access: getAccessToken(), refresh: getRefreshToken() };
    setSignedOut(true);
    await forget();
    // Blacklist the refresh token in the background; signing out here does not wait for it.
    authApi.logout(tokens);
  }, [forget]);

  const setUser = useCallback((next: User) => {
    const normalised = normaliseUser(next);
    if (!normalised) return;
    setUserState(normalised);
    updateSession({ user: normalised }, { onlyIfSaved: true });
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signedOut, login, logout, refreshUser, setUser }),
    [user, isLoading, signedOut, login, logout, refreshUser, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
