import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }
  const hostUri = Constants.expoConfig?.hostUri || '';
  const host = hostUri.split(':')[0];
  if (host) {
    return `http://${host}:5000`;
  }
  return 'http://127.0.0.1:5000';
};

export const API_BASE = getBaseUrl();

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }
  
  options.headers = headers;

  console.log(`API [${options.method || 'GET'}] ${url}`);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) errMsg = errJson.message;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export const api = {
  get: (path: string, options?: RequestInit) => request(path, { ...options, method: 'GET' }),
  post: (path: string, body?: any, options?: RequestInit) => request(path, { ...options, method: 'POST', body }),
  put: (path: string, body?: any, options?: RequestInit) => request(path, { ...options, method: 'PUT', body }),
  delete: (path: string, options?: RequestInit) => request(path, { ...options, method: 'DELETE' }),
};
