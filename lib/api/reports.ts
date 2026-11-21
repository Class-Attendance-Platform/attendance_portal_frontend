import { apiUrl } from './client';
import { downloadFile } from './download';
import type { ISODate, UUID } from './types';

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

const FORMAT_PARAM = 'format';

export interface ExportOptions {
  format: ExportFormat;
  date?: ISODate | null;
}

export const reportsApi = {
  exportUrl: (courseInfoId: UUID, { format, date }: ExportOptions) =>
    apiUrl(`/api/reports/course-info/${courseInfoId}/export/`, { [FORMAT_PARAM]: format, date }),

  download: (courseInfoId: UUID, options: ExportOptions) =>
    downloadFile(reportsApi.exportUrl(courseInfoId, options), {
      mimeType: EXPORT_MIME_TYPES[options.format],
      fallbackName: `attendance-${options.date ?? 'all'}.${options.format}`,
    }),
};
