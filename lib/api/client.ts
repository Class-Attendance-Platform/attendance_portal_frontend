import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { readWebTokens, sessionGeneration, updateSession, waitForWebSessionChange } from '../session';
import { refreshTokens, type RefreshEnv } from './refresh-core';

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
// Id of the user the tokens belong to: a tab never takes over a saved login of another account.
let tokenOwner: string | null = null;

/**
 * Sets this tab's tokens. `owner` (the user's id) is kept when left out; signing out (both null)
 * forgets it.
 */
export function setTokens(access: string | null, refresh: string | null, owner?: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (owner !== undefined) tokenOwner = owner;
  else if (!access && !refresh) tokenOwner = null;
}

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;
export const getTokenOwner = () => tokenOwner;

// Called when the server no longer accepts the saved login (refresh token expired or revoked),
// with the refresh token it refused.
let onSessionExpired: ((refused: string) => void) | null = null;
export function setSessionExpiredHandler(handler: ((refused: string) => void) | null) {
  onSessionExpired = handler;
}

// Plain instance for the refresh call itself (no interceptors, so no loops).
const bare = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Web Locks (every current browser and the desktop app): one tab refreshes at a time.
const locks: LockManager | null =
  typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function' ? navigator.locks : null;

/**
 * Runs `task` while no tab is refreshing (web), so it sees the newest saved pair; sign-out uses it.
 * Waits at most `maxWaitMs` for another tab's refresh, then runs anyway: signing out must not hang
 * on a slow network (a refresh that finishes after the sign-out throws its result away).
 * Elsewhere it just runs the task.
 */
export function whileNotRefreshing<T>(task: () => Promise<T>, maxWaitMs = 3000): Promise<T> {
  if (!locks || typeof AbortController === 'undefined') return task();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), maxWaitMs);
  let started = false;
  const run = () => {
    started = true;
    clearTimeout(timer);
    return task();
  };
  const locked = locks.request('portal-refresh', { signal: controller.signal }, run) as unknown as Promise<T>;
  return locked.catch((error) => {
    if (started) throw error;
    clearTimeout(timer);
    return task(); // waited too long (or no lock): go ahead without it
  });
}

function withRefreshLock<T>(manager: LockManager, task: () => Promise<T>): Promise<T> {
  // The browser waits for the task's promise (the DOM types say Promise<Promise<T>>).
  return manager.request('portal-refresh', task) as unknown as Promise<T>;
}

const refreshEnv: RefreshEnv = {
  getTokens: () => ({ access: accessToken, refresh: refreshToken }),
  setTokens: (access, refresh) => setTokens(access, refresh),
  owner: () => tokenOwner,
  readSaved: readWebTokens,
  save: (access, refresh) =>
    updateSession({ accessToken: access, refreshToken: refresh }, { onlyIfSaved: true, userId: tokenOwner }),
  send: async (token) => (await bare.post('/api/auth/refresh/', { refresh: token })).data,
  revoke: ({ access, refresh }) => {
    bare
      .post('/api/auth/logout/', { refresh }, { headers: { Authorization: `Bearer ${access}` } })
      .catch(() => {});
  },
  generation: sessionGeneration,
  lock: locks ? (task) => withRefreshLock(locks, task) : null,
  waitForOtherTab: () => waitForWebSessionChange(1500),
  now: () => Date.now(),
};

let refreshing: Promise<boolean> | null = null;

/**
 * Gets a new access token with the refresh token. The backend rotates refresh tokens (the old
 * one stops working), so the new pair is saved; on the web the tabs take turns and share the
 * newest pair (lib/api/refresh-core.ts). Several callers in a tab share one refresh.
 * Returns false if it failed; when the server refused the login the expiry handler runs.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = refreshTokens(refreshEnv)
      .then((result) => {
        if (result.ok) return true;
        // Network errors are not the end of the login: the user stays signed in and can retry.
        if (result.expired) onSessionExpired?.(result.expired);
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
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
