import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { api } from '../lib/api';

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
    if (Platform.OS === 'web') {
      try {
        const stored = localStorage.getItem('portal_user');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load user session from localStorage.", e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.success && res.user) {
        const loggedUser: User = {
          ...res.user,
          role: res.user.role.toUpperCase() as UserRole
        };
        setUser(loggedUser);
        if (Platform.OS === 'web') {
          localStorage.setItem('portal_user', JSON.stringify(loggedUser));
        }
        setIsLoading(false);
        return loggedUser;
      }
      throw new Error(res.message || "Failed to log in.");
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
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
