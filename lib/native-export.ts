import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAccessToken, refreshAccessToken } from './api';
import { reportService } from './services';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

/**
 * Phones: downloads a report with the login token, then opens the share sheet so
 * the teacher can save it to Files/Drive or send it. (The web app downloads directly.)
 */
export async function shareExportNative(courseInfoId: string, format: string, date?: string | null) {
  const url = reportService.getExportUrl(courseInfoId, format, date);
  const target = `${FileSystem.cacheDirectory}attendance-export.${format}`;
  const send = () =>
    FileSystem.downloadAsync(url, target, {
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });

  let result = await send();
  if (result.status === 401 && (await refreshAccessToken())) {
    result = await send();
  }
  if (result.status !== 200) {
    const text = await FileSystem.readAsStringAsync(result.uri).catch(() => '');
    let message = '';
    try {
      const data = JSON.parse(text);
      message = data.message || data.detail || '';
    } catch {
      // not JSON
    }
    throw new Error(message || `Failed to export ${format.toUpperCase()} report.`);
  }

  // Use the file name the server suggests, e.g. CSE301_attendance_full.xlsx
  const disposition = result.headers['Content-Disposition'] || result.headers['content-disposition'] || '';
  // (only letters, digits, dot, dash and underscore: a course code may contain "/" or "#")
  const name = disposition.match(/filename="?([^"]+)"?/i)?.[1]?.replace(/[^\w.-]/g, '_');
  let fileUri = result.uri;
  if (name) {
    fileUri = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.moveAsync({ from: result.uri, to: fileUri });
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri, { mimeType: MIME_TYPES[format], dialogTitle: 'Save or share the report' });
}
