import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getServerAddress } from '../server-address';
import { readWebTokens, sessionGeneration, updateSession, waitForWebSessionChange } from '../session';
import { refreshTokens, signOutReason, type RefreshEnv, type RefreshResult } from './refresh-core';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
    _retry?: boolean;
    _resent?: boolean;
    _generation?: number;
  }
}

export const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/+$/, '');

export type FieldErrors = Record<string, string[]>;

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

export function errorFromResponse(status: number, data: unknown): ApiError {
  const body = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  let fieldErrors = readFieldErrors(body.errors);
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
    return new ApiError(defaultMessage(0), { status: 0, code: 'network_error' });
  }
  if (error instanceof Error && error.message) return new ApiError(error.message);
  return new ApiError(defaultMessage(-1));
}

function jsonBody<T>(response: AxiosResponse<T>): T {
  const data: unknown = response.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError('The server sent an unexpected answer. Please try again.', {
      status: response.status,
      code: 'bad_response',
    });
  }
  return data as T;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenOwner: string | null = null;

export function setTokens(access: string | null, refresh: string | null, owner?: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (owner !== undefined) tokenOwner = owner;
  else if (!access && !refresh) tokenOwner = null;
}

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;
export const getTokenOwner = () => tokenOwner;

type SessionExpiredHandler = (refused: string, reason: ApiError | null) => void;
let onSessionExpired: SessionExpiredHandler | null = null;
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler;
}

const bare = axios.create({ timeout: 30000 });

bare.interceptors.request.use((config) => {
  config.baseURL = getServerAddress();
  return config;
});

const locks: LockManager | null =
  typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function' ? navigator.locks : null;

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
    return task();
  });
}

function withRefreshLock<T>(manager: LockManager, task: () => Promise<T>): Promise<T> {
  return manager.request('portal-refresh', task) as unknown as Promise<T>;
}

const refreshEnv: RefreshEnv = {
  getTokens: () => ({ access: accessToken, refresh: refreshToken }),
  setTokens: (access, refresh) => setTokens(access, refresh),
  owner: () => tokenOwner,
  readSaved: readWebTokens,
  save: (access, refresh) =>
    updateSession({ accessToken: access, refreshToken: refresh }, { onlyIfSaved: true, userId: tokenOwner }),
  send: async (token) => jsonBody(await bare.post('/api/auth/refresh/', { refresh: token })),
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

let refreshing: Promise<RefreshResult> | null = null;
let endedBecause: ApiError | null = null;

function refreshOnce(failure?: ApiError): Promise<RefreshResult> {
  endedBecause = signOutReason(endedBecause, failure);
  if (!refreshing) {
    refreshing = refreshTokens(refreshEnv)
      .then((result) => {
        if (!result.ok && result.expired) {
          const refusal = result.error ? toApiError(result.error) : null;
          onSessionExpired?.(result.expired, signOutReason(refusal, endedBecause));
        }
        return result;
      })
      .catch((): RefreshResult => ({ ok: false, expired: null }))
      .finally(() => {
        refreshing = null;
        endedBecause = null;
      });
  }
  return refreshing;
}

export function refreshAccessToken(): Promise<boolean> {
  return refreshOnce().then((result) => result.ok);
}

function withTrailingSlash(path: string): string {
  const split = path.search(/[?#]/);
  const base = split === -1 ? path : path.slice(0, split);
  const rest = split === -1 ? '' : path.slice(split);
  return base.endsWith('/') ? path : `${base}/${rest}`;
}

const http = axios.create({ timeout: 30000 });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getServerAddress();
  if (config.url) config.url = withTrailingSlash(config.url);
  if (accessToken && !config.skipAuth) config.headers.set('Authorization', `Bearer ${accessToken}`);
  if (config._generation === undefined) config._generation = sessionGeneration();
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const failure = toApiError(error);
    const config = error.config;
    if (
      failure.status === 401 &&
      config &&
      !config.skipAuth &&
      refreshToken &&
      config._generation === sessionGeneration()
    ) {
      if (!config._resent && accessToken && config.headers.get('Authorization') !== `Bearer ${accessToken}`) {
        config._resent = true;
        return http.request(config);
      }
      if (!config._retry) {
        config._retry = true;
        const refreshed = await refreshOnce(failure);
        if (refreshed.ok) return http.request(config);
        if (!refreshed.expired && refreshed.error) throw toApiError(refreshed.error);
      }
    }
    throw failure;
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    return jsonBody(await http.request<T>(config));
  } catch (error) {
    throw toApiError(error);
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

function cleanQuery(query?: Query) {
  if (!query) return undefined;
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

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

export const MULTIPART: AxiosRequestConfig = { headers: { 'Content-Type': 'multipart/form-data' } };

export function apiUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(cleanQuery(query) ?? {})) params.set(key, String(value));
  const search = params.toString();
  return `${getServerAddress()}${withTrailingSlash(path)}${search ? `?${search}` : ''}`;
}

export const bareClient = {
  post: async <T>(path: string, body: unknown, token?: string | null): Promise<T> => {
    try {
      const response = await bare.post<T>(withTrailingSlash(path), body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return jsonBody(response);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
