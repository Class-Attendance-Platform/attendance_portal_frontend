import { errorFromResponse, getAccessToken, refreshAccessToken, toApiError } from './client';

// Web: downloads a file with the sign-in token and saves it through the browser.
// (Phones use download.ts.)

export interface DownloadOptions {
  mimeType: string;
  /** Used when the server sends no file name. */
  fallbackName: string;
}

export async function downloadFile(url: string, { fallbackName }: DownloadOptions): Promise<void> {
  const send = () => {
    const token = getAccessToken();
    return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  };

  let response: Response;
  try {
    response = await send();
    // Expired sign-in: refresh it once, like the other API calls do.
    if (response.status === 401 && (await refreshAccessToken())) response = await send();
  } catch (error) {
    throw toApiError(error);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON
    }
    throw errorFromResponse(response.status, body);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const name = disposition.match(/filename="?([^"]+)"?/i)?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
