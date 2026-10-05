import React, { createContext, useState, useEffect, useContext } from 'react';
import { router, usePathname } from 'expo-router';
import { setSessionExpiredHandler, setTokens } from '../lib/api';
import { authService } from '../lib/services';
import { clearSession, loadSession, sessionGeneration, updateSession } from '../lib/session';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  userName: string;
  email: string;
  role: UserRole;
  faculty?: string;
  department?: string;
  studentId?: number;
  currentLevel?: string;
  currentSemester?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  /** Signs in with a user and tokens the backend already returned (e.g. right after sign-up). */
  startSession: (rawUser: any, access: string | null, refresh: string | null) => User;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pages that need a login but don't send you to the login page themselves.
const PROTECTED_PATHS = ['/dashboard', '/face/class'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function restoreSession() {
      // Web: localStorage; Android: the phone's secure store (see lib/session.ts)
      const stored = await loadSession();
      const rawUser = stored?.user;
      if (!rawUser) {
        setIsLoading(false);
        return;
      }
      const mappedUser: User = {
        ...rawUser,
        role: rawUser.role?.toUpperCase() as UserRole,
        studentId: rawUser.studentId ?? rawUser.student_profile?.student_id ?? rawUser.student_id
      };
      setUser(mappedUser);
      setTokens(stored.accessToken, stored.refreshToken);
      // Open the app now; the profile refresh below can be slow on a bad connection.
      setIsLoading(false);

      // Background refresh user data from server to get latest profiles
      const generation = sessionGeneration();
      try {
        const meRes = await authService.getMe();
        if (generation !== sessionGeneration()) return; // logged out meanwhile
        if (meRes.success && meRes.user) {
          const updatedUser: User = {
            ...meRes.user,
            role: meRes.user.role.toUpperCase() as UserRole,
            studentId: meRes.user.student_profile?.student_id
          };
          setUser(updatedUser);
          // Update only the profile: getMe may have refreshed (rotated) the
          // tokens, and the copies read at start-up are no longer valid.
          await updateSession({ user: updatedUser }, { onlyIfSaved: true });
        }
      } catch (err) {
        console.error('Failed to refresh user profile from server:', err);
      }
    }
    restoreSession();
  }, []);

  // The server no longer accepts this login (e.g. not used for over a week): log out.
  useEffect(() => {
    setSessionExpiredHandler(() => logout());
    return () => setSessionExpiredHandler(null);
  }, []);

  // Logged out (or the login expired) on a page that needs it: go to the login page.
  useEffect(() => {
    if (!isLoading && !user && PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, user, pathname]);

  const startSession = (rawUser: any, access: string | null, refresh: string | null): User => {
    const loggedUser: User = {
      ...rawUser,
      role: rawUser.role.toUpperCase() as UserRole,
      studentId: rawUser.student_profile?.student_id
    };
    setUser(loggedUser);
    setTokens(access, refresh);
    updateSession({ user: loggedUser, accessToken: access, refreshToken: refresh });
    return loggedUser;
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.user) {
        const loggedUser = startSession(res.user, res.access || null, res.refresh || null);
        setIsLoading(false);
        return loggedUser;
      }
      throw new Error(res.message || 'Failed to log in.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null, null);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, startSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
