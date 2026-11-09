import { apiUrl } from './client';
import { downloadFile } from './download';
import type { ISODate, UUID } from './types';

// Section 8 of the contract: course exports.

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'docx';

export const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
  { value: 'docx', label: 'Word (.docx)' },
];

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// The contract names the query parameter `format`. (The pre-v2 backend read `export_format`,
// because Django REST framework uses `?format=` for its own content negotiation.)
const FORMAT_PARAM = 'format';

export interface ExportOptions {
  format: ExportFormat;
  /** One date only; leave out for the whole course. */
  date?: ISODate | null;
}

export const reportsApi = {
  /** GET /reports/course-info/<id>/export/?format=…&date=… as a full URL. */
  exportUrl: (courseInfoId: UUID, { format, date }: ExportOptions) =>
    apiUrl(`/api/reports/course-info/${courseInfoId}/export/`, { [FORMAT_PARAM]: format, date }),

  /**
   * Downloads an export with the sign-in token. Web: saves the file. Phones: opens the share sheet
   * (save to Files/Drive or send). Rejects with an ApiError.
   */
  download: (courseInfoId: UUID, options: ExportOptions) =>
    downloadFile(reportsApi.exportUrl(courseInfoId, options), {
      mimeType: EXPORT_MIME_TYPES[options.format],
      fallbackName: `attendance-${options.date ?? 'all'}.${options.format}`,
    }),
};
