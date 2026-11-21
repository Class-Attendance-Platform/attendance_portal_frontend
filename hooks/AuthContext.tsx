import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useMessage } from '@/components/ui/message-bar';
import { authApi } from '@/lib/api/auth';
import {
  getAccessToken,
  getRefreshToken,
  isApiError,
  setSessionExpiredHandler,
  setTokens,
  whileNotRefreshing,
} from '@/lib/api/client';
import { afterRefused, newestTokens } from '@/lib/api/refresh-core';
import type { Role, User } from '@/lib/api/types';
import {
  clearSession,
  invalidateSession,
  loadSession,
  readWebTokens,
  sessionGeneration,
  updateSession,
  WEB_SESSION_KEY,
} from '@/lib/session';
import { sharedRequest } from '@/lib/shared-request';

export type { Role as UserRole, User } from '@/lib/api/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signedOut: boolean;
  login: (email: string, password: string) => Promise<User>;
  adoptSession: (session: { user: User; access: string; refresh: string }) => User;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];

const PROFILE_REUSE_MS = 5000;

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

  const forget = useCallback(() => {
    setUserState(null);
    setTokens(null, null);
    return clearSession();
  }, []);

  const leave = useCallback(() => {
    invalidateSession();
    setUserState(null);
    setTokens(null, null);
  }, []);

  const startSession = useCallback((rawUser: unknown, access: string | null, refresh: string | null) => {
    const signedIn = normaliseUser(rawUser);
    if (!signedIn) throw new Error('The server sent an unexpected answer. Please try again.');
    setTokens(access, refresh, signedIn.id);
    setUserState(signedIn);
    updateSession({ user: signedIn, accessToken: access, refreshToken: refresh });
    return signedIn;
  }, []);

  const [askProfile] = useState(() => sharedRequest<User | null>(PROFILE_REUSE_MS));

  const refreshUser = useCallback(() => {
    const generation = sessionGeneration();
    return askProfile(generation, async () => {
      const response = await authApi.me();
      if (generation !== sessionGeneration()) return null;
      const fresh = normaliseUser(response.user);
      if (!fresh) return null;
      setUserState(fresh);
      await updateSession({ user: fresh }, { onlyIfSaved: true, userId: fresh.id });
      return fresh;
    });
  }, [askProfile]);

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
      setTokens(stored.accessToken, stored.refreshToken, savedUser.id);
      setUserState(savedUser);
      setIsLoading(false);
      refreshUser().catch((error) => {
        if (!isApiError(error) || error.status !== 0) console.warn('Could not refresh the profile.', error);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    setSessionExpiredHandler((refused, reason) => {
      const current = userRef.current;
      if (!current) return;
      const saved = readWebTokens();
      switch (afterRefused(saved, refused, current.id)) {
        case 'adopt':
          setTokens(saved!.access, saved!.refresh, current.id);
          return;
        case 'leave':
          leave();
          return;
        case 'clear':
          forget();
          message.info(reason?.message || 'Your sign-in has expired. Please sign in again.');
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [forget, leave, message]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WEB_SESSION_KEY && event.key !== null) return;
      const saved = readWebTokens();
      const current = userRef.current;
      if (!saved) {
        leave();
        return;
      }
      if (current && saved.userId && saved.userId !== current.id) {
        const tokens = { access: getAccessToken(), refresh: getRefreshToken() };
        leave();
        authApi.logout(tokens);
        message.info('Another account signed in in another tab, so this tab was signed out.');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [leave, message]);

  const adoptSession = useCallback(
    (session: { user: User; access: string; refresh: string }) => {
      setSignedOut(false);
      return startSession(session.user, session.access ?? null, session.refresh ?? null);
    },
    [startSession]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      return adoptSession(response);
    },
    [adoptSession]
  );

  const logout = useCallback(async () => {
    setSignedOut(true);
    const tokens = await whileNotRefreshing(async () => {
      const newest = newestTokens(readWebTokens(), userRef.current?.id ?? null, {
        access: getAccessToken(),
        refresh: getRefreshToken(),
      });
      await forget();
      return newest;
    });
    authApi.logout(tokens);
  }, [forget]);

  const setUser = useCallback((next: User) => {
    const normalised = normaliseUser(next);
    if (!normalised) return;
    setUserState(normalised);
    updateSession({ user: normalised }, { onlyIfSaved: true, userId: normalised.id });
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signedOut, login, adoptSession, logout, refreshUser, setUser }),
    [user, isLoading, signedOut, login, adoptSession, logout, refreshUser, setUser]
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
