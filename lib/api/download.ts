import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError, errorFromResponse, getAccessToken, refreshAccessToken, toApiError } from './client';

// Phones: downloads a file with the sign-in token into the cache, then opens the share sheet so
// the user can save it to Files/Drive or send it. The web version is download.web.ts.

export interface DownloadOptions {
  mimeType: string;
  /** Used when the server sends no file name. */
  fallbackName: string;
}

const safeName = (name: string) => name.replace(/[^\w.-]/g, '_');

export async function downloadFile(url: string, { mimeType, fallbackName }: DownloadOptions): Promise<void> {
  const target = `${FileSystem.cacheDirectory}download-${Date.now()}`;
  const send = () =>
    FileSystem.downloadAsync(url, target, {
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });

  let result;
  try {
    result = await send();
    if (result.status === 401 && (await refreshAccessToken())) result = await send();
  } catch (error) {
    throw toApiError(error);
  }

  if (result.status !== 200) {
    const text = await FileSystem.readAsStringAsync(result.uri).catch(() => '');
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON
    }
    throw errorFromResponse(result.status, body);
  }

  // Use the file name the server suggests, e.g. CSE301_attendance_full.xlsx
  // (only letters, digits, dot, dash and underscore: a course code may contain "/" or "#").
  const disposition = result.headers['Content-Disposition'] || result.headers['content-disposition'] || '';
  const name = safeName(disposition.match(/filename="?([^"]+)"?/i)?.[1] || fallbackName);
  const fileUri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  await FileSystem.moveAsync({ from: result.uri, to: fileUri });

  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Save or share the file' });
}
