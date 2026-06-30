import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { setTokens } from '../lib/api';
import { authService } from '../lib/services';

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (Platform.OS === 'web') {
        try {
          const stored = localStorage.getItem('portal_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            const rawUser = parsed && parsed.user ? parsed.user : parsed;
            const access = parsed && parsed.accessToken ? parsed.accessToken : null;
            const refresh = parsed && parsed.refreshToken ? parsed.refreshToken : null;

            if (rawUser) {
              const mappedUser: User = {
                ...rawUser,
                role: rawUser.role?.toUpperCase() as UserRole,
                studentId: rawUser.studentId ?? rawUser.student_profile?.student_id ?? rawUser.student_id
              };
              setUser(mappedUser);
              setTokens(access, refresh);

              // Background refresh user data from server to get latest profiles
              try {
                const meRes = await authService.getMe();
                if (meRes.success && meRes.user) {
                  const updatedUser: User = {
                    ...meRes.user,
                    role: meRes.user.role.toUpperCase() as UserRole,
                    studentId: meRes.user.student_profile?.student_id
                  };
                  setUser(updatedUser);
                  localStorage.setItem('portal_user', JSON.stringify({
                    user: updatedUser,
                    accessToken: access,
                    refreshToken: refresh,
                  }));
                }
              } catch (err) {
                console.error('Failed to refresh user profile from server:', err);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load user session from localStorage.', e);
        }
      }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.user) {
        const loggedUser: User = {
          ...res.user,
          role: res.user.role.toUpperCase() as UserRole,
          studentId: res.user.student_profile?.student_id
        };
        setUser(loggedUser);

        const access = res.access || null;
        const refresh = res.refresh || null;
        setTokens(access, refresh);

        if (Platform.OS === 'web') {
          localStorage.setItem('portal_user', JSON.stringify({
            user: loggedUser,
            accessToken: access,
            refreshToken: refresh,
          }));
        }
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
    if (Platform.OS === 'web') {
      localStorage.removeItem('portal_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
