import { api } from './client';
import type { Ok } from './types';

export interface AppConfig extends Ok {
  app_name: string;
  faculty: string;
  department: string;
  attendance_min_percent: number;
  email_reset_enabled: boolean;
  min_app_version: string;
  latest_app_version: string;
  download_url: string;
  levels: string[];
  terms: string[];
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  success: true,
  app_name: 'HSTU Attendance Portal',
  faculty: 'Computer Science and Engineering',
  department: 'CSE',
  attendance_min_percent: 75,
  email_reset_enabled: false,
  min_app_version: '1.0.0',
  latest_app_version: '1.0.0',
  download_url: 'https://github.com/Class-Attendance-Platform/attendance_portal_frontend/releases/latest',
  levels: ['First', 'Second', 'Third', 'Fourth'],
  terms: ['I', 'II'],
};

export interface FacultiesResponse extends Ok {
  faculties: string[];
}

export interface DepartmentsResponse extends Ok {
  departments: string[];
}

export interface CreditsResponse extends Ok {
  creditEnumMap: Record<string, string>;
  revCreditMap: Record<string, string>;
}

let appConfigRequest: Promise<AppConfig> | null = null;

export const configApi = {
  app: () => api.get<AppConfig>('/api/config/app/', undefined, { skipAuth: true }),

  appCached: (): Promise<AppConfig> => {
    if (!appConfigRequest) {
      appConfigRequest = configApi.app().catch(() => {
        appConfigRequest = null;
        return DEFAULT_APP_CONFIG;
      });
    }
    return appConfigRequest;
  },

  faculties: () => api.get<FacultiesResponse>('/api/config/faculties/', undefined, { skipAuth: true }),
  departments: () => api.get<DepartmentsResponse>('/api/config/departments/', undefined, { skipAuth: true }),
  credits: () => api.get<CreditsResponse>('/api/config/credits/', undefined, { skipAuth: true }),
};
