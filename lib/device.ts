import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// A random id per install (phones) or per browser (web). Check-ins send it so one phone cannot
// check in several students in the same session. It is not tied to the hardware and is kept
// when the user signs out.

const KEY = 'portal_device_id';
let cached: string | null = null;

function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
  } else {
    for (let i = 0; i < bytes; i += 1) values[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function read(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function write(value: string) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(KEY, value);
    else await SecureStore.setItemAsync(KEY, value);
  } catch {
    // Storage blocked (private window): the id lasts until the app is closed.
  }
}

/** This install's device id (32 hex characters), created on first use. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await read();
  if (stored && /^[a-f0-9]{16,64}$/.test(stored)) {
    cached = stored;
    return stored;
  }
  const created = randomHex(16);
  cached = created;
  await write(created);
  return created;
}
