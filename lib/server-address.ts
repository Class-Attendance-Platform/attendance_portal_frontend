import { Platform } from 'react-native';

export const SERVER_ADDRESS_KEY = 'portal_api_base';

export type DesktopBridge = {
  defaultApiBase: string;
  onOpenServerSettings: (callback: () => void) => () => void;
  onGoBack?: (callback: () => void) => () => void;
};

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

const isWeb = Platform.OS === 'web';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function desktopBridge(): DesktopBridge | undefined {
  return typeof window !== 'undefined' ? window.desktop : undefined;
}

export function builtInServerAddress(): string {
  const fromDesktop = desktopBridge()?.defaultApiBase?.trim();
  if (fromDesktop) return trimTrailingSlashes(fromDesktop);
  if (process.env.EXPO_PUBLIC_API_URL !== undefined) return trimTrailingSlashes(process.env.EXPO_PUBLIC_API_URL);
  return typeof window !== 'undefined' ? '' : `http://127.0.0.1:${process.env.EXPO_PUBLIC_API_PORT || '8000'}`;
}

function storage(): Storage | null {
  if (!isWeb || typeof localStorage === 'undefined') return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function normalizeServerAddress(input: string): string {
  const value = trimTrailingSlashes(input.trim());
  if (!value) return '';
  try {
    const url = new URL(value);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname) return url.origin + trimTrailingSlashes(url.pathname);
  } catch {
  }
  return '';
}

export function readSavedServerAddress(): string {
  try {
    return normalizeServerAddress(storage()?.getItem(SERVER_ADDRESS_KEY) ?? '');
  } catch {
    return '';
  }
}

export function getServerAddress(): string {
  return readSavedServerAddress() || builtInServerAddress();
}

export function saveServerAddress(address: string): string {
  const normalized = normalizeServerAddress(address);
  if (!normalized) throw new Error('Enter a full address, starting with http:// or https://.');
  const store = storage();
  if (store) store.setItem(SERVER_ADDRESS_KEY, normalized);
  return normalized;
}

export function clearServerAddress() {
  try {
    storage()?.removeItem(SERVER_ADDRESS_KEY);
  } catch {
  }
}
