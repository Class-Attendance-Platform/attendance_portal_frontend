import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { readWebRefreshToken, updateSession } from '../session';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Public endpoint: send no token and never try a refresh. */
    skipAuth?: boolean;
    /** Internal: this request was already retried after a refresh. */
    _retry?: boolean;
  }
}

// Backend address. Set EXPO_PUBLIC_API_URL (e.g. in .env.local) for a deployed backend.
// No trailing slash: paths are joined as `${API_BASE}/api/...`.
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// Public address of the web app (EXPO_PUBLIC_WEB_URL). Links people open in a browser (QR
// check-in links, password reset) point here. Empty in local development.
export const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/+$/, '');

// ---------------------------------------------------------------------------------------------
// Errors

export type FieldErrors = Record<string, string[]>;

/**
 * Every failed request rejects with an ApiError.
 * - `message`: one readable sentence (the server's `message`, or a plain default).
 * - `code`: the server's machine code (e.g. "pending_approval"), or null.
 * - `fieldErrors`: `{field: ["msg"]}` from a 400, empty otherwise.
 * - `status`: HTTP status; 0 when the server could not be reached.
 * - `body`: the raw JSON body (for extra keys such as `session_id` on a 409).
 */
export class ApiError extends Error {
  readonly code: string | null;
  readonly fieldErrors: FieldErrors;
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(
    message: string,
    options: { code?: string | null; fieldErrors?: FieldErrors; status?: number; body?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? null;
    this.fieldErrors = options.fieldErrors ?? {};
    this.status = options.status ?? 0;
    this.body = options.body ?? {};
  }

  /** The first error for a form field, if the server sent one. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const STATUS_MESSAGES: Record<number, string> = {
  0: "Can't reach the server. Check your internet connection and try again.",
  400: 'Please check the details and try again.',
  401: 'Please sign in again.',
  403: "You don't have permission to do that.",
  404: 'Not found. It may have been removed.',
  405: 'This action is not available.',
  409: 'This clashes with something that already exists.',
  410: 'This has ended.',
  413: 'The file is too large.',
  429: 'Too many attempts. Please wait a minute and try again.',
  502: 'The server is not answering right now. Please try again in a moment.',
  503: 'The server is busy right now. Please try again in a moment.',
  504: 'The server took too long to answer. Please try again.',
};

function defaultMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? 'Something went wrong on the server. Please try again.' : 'Something went wrong. Please try again.');
}

function asStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(asStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(asStrings);
  return [];
}

function readFieldErrors(source: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return result;
  for (const [field, value] of Object.entries(source)) {
    const messages = asStrings(value);
    if (messages.length) result[field] = messages;
  }
  return result;
}

const META_KEYS = new Set(['success', 'message', 'detail', 'code', 'errors']);

/** Builds an ApiError from an HTTP status and a response body (JSON object, text or nothing). */
export function errorFromResponse(status: number, data: unknown): ApiError {
  const body = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  let fieldErrors = readFieldErrors(body.errors);
  // DRF-style `{"field": ["msg"]}` at the top level (no `errors` wrapper).
  if (!Object.keys(fieldErrors).length && status === 400 && typeof body.message !== 'string') {
    fieldErrors = readFieldErrors(Object.fromEntries(Object.entries(body).filter(([key]) => !META_KEYS.has(key))));
  }
  const firstFieldError = Object.values(fieldErrors)[0]?.[0];
  const message =
    (typeof body.message === 'string' && body.message) ||
    (typeof body.detail === 'string' && body.detail) ||
    firstFieldError ||
    defaultMessage(status);
  const code = typeof body.code === 'string' ? body.code : null;
  return new ApiError(message, { code, fieldErrors, status, body });
}

/** Turns anything a request can throw into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) return errorFromResponse(axiosError.response.status, axiosError.response.data);
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new ApiError(defaultMessage(504), { status: 0, code: 'timeout' });
    }
    return new ApiError(defaultMessage(0), { status: 0, code: 'network_error' });
  }
  if (error instanceof TypeError) {
    // fetch() network failure
    return new ApiError(defaultMessage(0), { status: 0, code: 'network_error' });
  }
  if (error instanceof Error && error.message) return new ApiError(error.message);
  return new ApiError(defaultMessage(-1));
}

// ---------------------------------------------------------------------------------------------
// Tokens

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
}

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

// Called when the server no longer accepts the saved login (refresh token expired or revoked).
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

// Plain instance for the refresh call itself (no interceptors, so no loops).
const bare = axios.create({ baseURL: API_BASE, timeout: 30000 });

let refreshing: Promise<boolean> | null = null;

/**
 * Gets a new access token with the refresh token. The backend rotates refresh tokens (the old
 * one stops working), so the new pair is saved. Several callers share one refresh.
 * Returns false if it failed; a 401 means the login is over (the expiry handler runs).
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  // Web: another tab may have rotated the token already; use the newest saved one.
  refreshToken = readWebRefreshToken() ?? refreshToken;
  if (!refreshToken) return false;
  const send = (token: string) => bare.post('/api/auth/refresh/', { refresh: token });
  try {
    let response;
    try {
      response = await send(refreshToken);
    } catch (error: any) {
      // Another tab may have rotated it while we were sending: retry once with the newest one.
      const latest = readWebRefreshToken();
      if (error?.response?.status !== 401 || !latest || latest === refreshToken) throw error;
      refreshToken = latest;
      response = await send(latest);
    }
    const data = response.data ?? {};
    if (!data.access) return false;
    accessToken = data.access;
    if (data.refresh) refreshToken = data.refresh;
    // Keep the saved login in step, unless the user signed out meanwhile.
    updateSession({ accessToken, refreshToken }, { onlyIfSaved: true });
    return true;
  } catch (error: any) {
    // 401: the refresh token itself is expired or revoked, so this login is over.
    // (Network errors are not: the user stays signed in and can retry.)
    if (error?.response?.status === 401) onSessionExpired?.();
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// The axios instance

/** Django needs the trailing slash: `/api/auth/me` → `/api/auth/me/` (query string kept). */
function withTrailingSlash(path: string): string {
  const split = path.search(/[?#]/);
  const base = split === -1 ? path : path.slice(0, split);
  const rest = split === -1 ? '' : path.slice(split);
  return base.endsWith('/') ? path : `${base}/${rest}`;
}

const http = axios.create({ baseURL: API_BASE, timeout: 30000 });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) config.url = withTrailingSlash(config.url);
  if (accessToken && !config.skipAuth) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    if (error.response?.status === 401 && config && !config.skipAuth && !config._retry && refreshToken) {
      config._retry = true;
      if (await refreshAccessToken()) {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
        return http.request(config);
      }
    }
    throw toApiError(error);
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<T>(config);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Query parameters: empty values (undefined, null, '') are left out. */
export type Query = Record<string, string | number | boolean | null | undefined>;

function cleanQuery(query?: Query) {
  if (!query) return undefined;
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

/**
 * Typed helpers. Paths start with `/api/`. They resolve to the JSON body and reject with an
 * ApiError. Screens should call the area modules (`lib/api/auth.ts`, ...), not these directly.
 */
export const api = {
  get: <T>(path: string, query?: Query, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url: path, params: cleanQuery(query) }),
  post: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url: path, data: body }),
  put: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url: path, data: body }),
  patch: <T>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url: path, data: body }),
  delete: <T>(path: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'DELETE', url: path }),
};

/** Multipart uploads (FormData). */
export const MULTIPART: AxiosRequestConfig = { headers: { 'Content-Type': 'multipart/form-data' } };

/** Full URL for a path, with the query string (for downloads). */
export function apiUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(cleanQuery(query) ?? {})) params.set(key, String(value));
  const search = params.toString();
  return `${API_BASE}${withTrailingSlash(path)}${search ? `?${search}` : ''}`;
}

/** Calls without the interceptors, with a token given by the caller (sign-out uses this). */
export const bareClient = {
  post: async <T>(path: string, body: unknown, token?: string | null): Promise<T> => {
    try {
      const response = await bare.post<T>(withTrailingSlash(path), body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
