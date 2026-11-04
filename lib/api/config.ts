import { api } from './client';
import type { Ok } from './types';

// GET /config/app/ and the older enum lists.

export interface AppConfig extends Ok {
  app_name: string;
  faculty: string;
  department: string;
  /** Students below this are flagged (75). */
  attendance_min_percent: number;
  /** False: "Forgot password" by email is off; an admin resets passwords. */
  email_reset_enabled: boolean;
  min_app_version: string;
  latest_app_version: string;
  download_url: string;
  levels: string[];
  terms: string[];
}

/** Used until the server answers (or when it cannot be reached). */
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
  /** "3.00" → "CREDIT_3_00" */
  creditEnumMap: Record<string, string>;
  /** "CREDIT_3_00" → "3.00" */
  revCreditMap: Record<string, string>;
}

let appConfigRequest: Promise<AppConfig> | null = null;

export const configApi = {
  /** GET /config/app/ (public). */
  app: () => api.get<AppConfig>('/api/config/app/', undefined, { skipAuth: true }),

  /**
   * The app config, fetched once per app start and shared. Falls back to DEFAULT_APP_CONFIG
   * if the server cannot be reached (and tries again next time).
   */
  appCached: (): Promise<AppConfig> => {
    if (!appConfigRequest) {
      appConfigRequest = configApi.app().catch(() => {
        appConfigRequest = null;
        return DEFAULT_APP_CONFIG;
      });
    }
    return appConfigRequest;
  },

  /** GET /config/faculties/ */
  faculties: () => api.get<FacultiesResponse>('/api/config/faculties/', undefined, { skipAuth: true }),
  /** GET /config/departments/ */
  departments: () => api.get<DepartmentsResponse>('/api/config/departments/', undefined, { skipAuth: true }),
  /** GET /config/credits/ */
  credits: () => api.get<CreditsResponse>('/api/config/credits/', undefined, { skipAuth: true }),
};
