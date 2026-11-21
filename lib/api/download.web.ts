import { errorFromResponse, getAccessToken, refreshAccessToken, toApiError } from './client';

export interface DownloadOptions {
  mimeType: string;
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
