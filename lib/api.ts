import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  return 'https://attendance-portal-backend-476r.onrender.com/'; //'http://127.0.0.1:8000/'; ;
};

export const API_BASE = getBaseUrl();

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string | null, refresh: string | null) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = () => accessToken;

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

function formatPath(path: string): string {
  const queryIdx = path.indexOf('?');
  const hashIdx = path.indexOf('#');
  const splitIdx = queryIdx !== -1 ? queryIdx : hashIdx !== -1 ? hashIdx : -1;

  let basePart = splitIdx !== -1 ? path.slice(0, splitIdx) : path;
  const suffixPart = splitIdx !== -1 ? path.slice(splitIdx) : '';

  if (!basePart.endsWith('/')) {
    basePart = `${basePart}/`;
  }
  return `${basePart}${suffixPart}`;
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.url) {
      config.url = formatPath(config.url);
    }
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push((token) => {
        resolve(!!token);
      });
    });
  }

  isRefreshing = true;
  try {
    const refreshUrl = `${API_BASE}/api/auth/refresh/`;
    console.log('Sending refresh token request to backend...', refreshUrl);
    const response = await axios.post(refreshUrl, { refresh: refreshToken });

    if (response.status === 200 && response.data && response.data.access) {
      accessToken = response.data.access;
      if (Platform.OS === 'web') {
        try {
          const stored = localStorage.getItem('portal_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.accessToken = accessToken;
            localStorage.setItem('portal_user', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('Failed to update localStorage with refreshed access token', e);
        }
      }

      isRefreshing = false;
      const subscribers = refreshSubscribers;
      refreshSubscribers = [];
      subscribers.forEach((callback) => callback(accessToken!));
      return true;
    }
  } catch (err) {
    console.error('Error refreshing token', err);
  }

  isRefreshing = false;
  refreshSubscribers = [];
  return false;
}

axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      refreshToken &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/auth/refresh/' &&
      originalRequest.url !== '/api/auth/login/'
    ) {
      originalRequest._retry = true;
      console.log('Access token expired or unauthorized, attempting refresh...');
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        console.log(
          `Retrying API [${originalRequest.method?.toUpperCase() || 'GET'}] ${originalRequest.url}`
        );
        return axiosInstance(originalRequest);
      }
    }

    let errMsg = `Request failed with status ${error.response?.status || error.message}`;
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data && typeof data === 'object') {
        if (data.message) {
          errMsg = data.message;
        } else if (data.detail) {
          errMsg = data.detail;
        } else if (data.errors) {
          if (typeof data.errors === 'object') {
            const firstKey = Object.keys(data.errors)[0];
            const firstVal = data.errors[firstKey];
            if (Array.isArray(firstVal)) {
              errMsg = `${firstKey}: ${firstVal[0]}`;
            } else {
              errMsg = `${firstKey}: ${JSON.stringify(firstVal)}`;
            }
          } else {
            errMsg = JSON.stringify(data.errors);
          }
        } else {
          const keys = Object.keys(data).filter((k) => k !== 'success');
          if (keys.length > 0) {
            const firstKey = keys[0];
            const firstVal = (data as any)[firstKey];
            if (Array.isArray(firstVal)) {
              errMsg = `${firstKey}: ${firstVal[0]}`;
            } else if (typeof firstVal === 'string') {
              errMsg = `${firstKey}: ${firstVal}`;
            } else {
              errMsg = `${firstKey}: ${JSON.stringify(firstVal)}`;
            }
          }
        }
      }
    }
    return Promise.reject(new Error(errMsg));
  }
);

export const api = {
  get: (path: string, options?: AxiosRequestConfig): Promise<any> =>
    axiosInstance.get(path, options) as any,
  post: (path: string, body?: any, options?: AxiosRequestConfig): Promise<any> =>
    axiosInstance.post(path, body, options) as any,
  put: (path: string, body?: any, options?: AxiosRequestConfig): Promise<any> =>
    axiosInstance.put(path, body, options) as any,
  delete: (path: string, options?: AxiosRequestConfig): Promise<any> =>
    axiosInstance.delete(path, options) as any,
};
