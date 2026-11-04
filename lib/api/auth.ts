import { updateSession } from '../session';
import { api, bareClient, getTokenOwner, isApiError, setTokens } from './client';
import type { Ok, OkMessage, User } from './types';

// Section 1 of the contract: accounts and sign-in.

/** Machine codes the auth endpoints send on errors (`ApiError.code`). */
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

/** 201: the account waits for admin approval. No tokens. */
export interface RegisterResponse extends OkMessage {
  status: 'pending';
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
  /** POST /auth/login/. Errors: 401 invalid_credentials, 403 pending_approval / account_disabled. */
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login/', { email: email.trim(), password }, { skipAuth: true }),

  /** POST /auth/register/. Duplicate email / student id / employee id → 400 field errors. */
  register: (body: RegisterBody) => api.post<RegisterResponse>('/api/auth/register/', body, { skipAuth: true }),

  /**
   * POST /auth/logout/: blacklists the refresh token. Takes the tokens explicitly because the app
   * forgets them right away. If the access token has expired it gets a fresh pair first, so the
   * newest refresh token is the one blacklisted. Never throws.
   */
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
        // The refresh token was already invalid: nothing left to blacklist.
      }
    }
  },

  /** GET /auth/me/ */
  me: () => api.get<MeResponse>('/api/auth/me/'),

  /** PATCH /auth/me/: users may change only their name. */
  updateMe: (body: UpdateMeBody) => api.patch<MeResponse>('/api/auth/me/', body),

  /**
   * POST /auth/password/change/. 400 wrong_password or field errors. The server signs out other
   * devices and returns a fresh pair, which is saved here.
   */
  changePassword: async (body: ChangePasswordBody) => {
    const response = await api.post<ChangePasswordResponse>('/api/auth/password/change/', body);
    setTokens(response.tokens.access, response.tokens.refresh);
    await updateSession(
      { accessToken: response.tokens.access, refreshToken: response.tokens.refresh },
      { onlyIfSaved: true, userId: getTokenOwner() }
    );
    return response;
  },

  /** POST /auth/password/forgot/. 503 email_not_configured when the server has no email set up. */
  forgotPassword: (email: string) =>
    api.post<OkMessage>('/api/auth/password/forgot/', { email: email.trim() }, { skipAuth: true }),

  /** POST /auth/password/reset/ with the uid and token from the email link. 400 invalid_link. */
  resetPassword: (body: ResetPasswordBody) =>
    api.post<OkMessage>('/api/auth/password/reset/', body, { skipAuth: true }),
};
