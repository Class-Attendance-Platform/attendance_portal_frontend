import { updateSession } from '../session';
import { appendPhoto } from '../upload';
import { api, bareClient, getTokenOwner, isApiError, MULTIPART, setTokens } from './client';
import { notifyFaceChange, type RegisterFacePhotos } from './faces';
import type { Ok, OkMessage, User } from './types';

export const AUTH_ERRORS = {
  invalidCredentials: 'invalid_credentials',
  pendingApproval: 'pending_approval',
  accountDisabled: 'account_disabled',
  wrongPassword: 'wrong_password',
  emailNotConfigured: 'email_not_configured',
  invalidLink: 'invalid_link',
} as const;

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface LoginResponse extends Ok, TokenPair {
  user: User;
}

export interface StudentRegisterBody {
  role: 'STUDENT';
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  student_id: number;
  current_level: string;
  current_semester: string;
}

export interface TeacherRegisterBody {
  role: 'TEACHER';
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  employee_id: string;
}

export type RegisterBody = StudentRegisterBody | TeacherRegisterBody;

export interface RegisterResponse extends OkMessage, TokenPair {
  status: 'approved';
  user: User;
}

export interface MeResponse extends Ok {
  user: User;
}

export interface UpdateMeBody {
  first_name?: string;
  last_name?: string;
}

export interface ChangePasswordBody {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse extends Ok {
  tokens: TokenPair;
}

export interface ResetPasswordBody {
  uid: string;
  token: string;
  new_password: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login/', { email: email.trim(), password }, { skipAuth: true }),

  checkRegister: (body: RegisterBody) => api.post<Ok>('/api/auth/register/check/', body, { skipAuth: true }),

  register: (body: TeacherRegisterBody) => api.post<RegisterResponse>('/api/auth/register/', body, { skipAuth: true }),

  registerStudent: async (body: StudentRegisterBody, photos: RegisterFacePhotos) => {
    const form = new FormData();
    form.append('role', body.role);
    form.append('email', body.email);
    form.append('password', body.password);
    form.append('first_name', body.first_name);
    form.append('last_name', body.last_name);
    form.append('student_id', String(body.student_id));
    form.append('current_level', body.current_level);
    form.append('current_semester', body.current_semester);
    form.append('consent', 'true');
    await appendPhoto(form, 'straight', photos.straight);
    await appendPhoto(form, 'left', photos.left);
    await appendPhoto(form, 'right', photos.right);
    const result = await api.post<RegisterResponse>('/api/auth/register/', form, {
      ...MULTIPART,
      skipAuth: true,
      timeout: 120000,
    });
    notifyFaceChange();
    return result;
  },

  logout: async (tokens: { access: string | null; refresh: string | null }) => {
    if (!tokens.refresh) return;
    try {
      await bareClient.post<Ok>('/api/auth/logout/', { refresh: tokens.refresh }, tokens.access);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) return;
      try {
        const fresh = await bareClient.post<{ access: string; refresh?: string }>('/api/auth/refresh/', {
          refresh: tokens.refresh,
        });
        await bareClient.post<Ok>('/api/auth/logout/', { refresh: fresh.refresh ?? tokens.refresh }, fresh.access);
      } catch {
      }
    }
  },

  me: () => api.get<MeResponse>('/api/auth/me/'),

  updateMe: (body: UpdateMeBody) => api.patch<MeResponse>('/api/auth/me/', body),

  changePassword: async (body: ChangePasswordBody) => {
    const response = await api.post<ChangePasswordResponse>('/api/auth/password/change/', body);
    setTokens(response.tokens.access, response.tokens.refresh);
    await updateSession(
      { accessToken: response.tokens.access, refreshToken: response.tokens.refresh },
      { onlyIfSaved: true, userId: getTokenOwner() }
    );
    return response;
  },

  forgotPassword: (email: string) =>
    api.post<OkMessage>('/api/auth/password/forgot/', { email: email.trim() }, { skipAuth: true }),

  resetPassword: (body: ResetPasswordBody) =>
    api.post<OkMessage>('/api/auth/password/reset/', body, { skipAuth: true }),
};
