import { Download } from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/lib/api/client';
import { reportsApi, type ExportFormat } from '@/lib/api/reports';
import type { ClassDate } from '@/lib/api/teacher';
import type { UUID } from '@/lib/api/types';
import { formatDate, formatDateWithWeekday } from '@/lib/format';
import { ChoiceGroup } from './choice-group';

const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'pdf', label: 'PDF', hint: 'PDF: ready to print or send (P = present, A = absent).' },
  { value: 'xlsx', label: 'Excel', hint: 'Excel: a spreadsheet to sort, filter or add your own columns.' },
  { value: 'csv', label: 'CSV', hint: 'CSV: a plain table that opens in any spreadsheet program.' },
  { value: 'docx', label: 'Word', hint: 'Word: a document you can edit before printing.' },
];

type Scope = 'all' | 'date';

export type ExportFormProps = {
  courseInfoId: UUID;
  courseCode: string;
  dates: ClassDate[];
  /** Start with one date chosen. */
  initialDate?: string | null;
  /** Called after a successful download (e.g. to close a dialog). */
  onDone?: () => void;
};

/** Pick the format and whole course or one date, then download (web) or share (phones). */
export function ExportForm({ courseInfoId, courseCode, dates, initialDate, onDone }: ExportFormProps) {
  const message = useMessage();
  const [format, setFormat] = React.useState<ExportFormat>('pdf');
  const [scope, setScope] = React.useState<Scope>(initialDate ? 'date' : 'all');
  const [date, setDate] = React.useState<string | null>(initialDate ?? dates[0]?.date ?? null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const chosen = FORMATS.find((item) => item.value === format)!;
  const needsDate = scope === 'date' && !date;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await reportsApi.download(courseInfoId, { format, date: scope === 'date' ? date : null });
      const what = scope === 'date' && date ? `${courseCode}, ${formatDate(date)}` : `${courseCode}, all classes`;
      message.success(Platform.OS === 'web' ? `Downloaded ${chosen.label} file (${what}).` : `${chosen.label} file ready (${what}).`);
      onDone?.();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : 'Could not export the file. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text weight="semibold">Format</Text>
        <ChoiceGroup<ExportFormat>
          label="File format"
          value={format}
          onChange={setFormat}
          choices={FORMATS.map((item) => ({ value: item.value, label: item.label }))}
        />
        <Text variant="small" tone="muted">
          {chosen.hint}
        </Text>
      </View>

      <View className="gap-2">
        <Text weight="semibold">What to export</Text>
        <ChoiceGroup<Scope>
          label="What to export"
          value={scope}
          onChange={setScope}
          choices={[
            { value: 'all', label: 'Whole course' },
            { value: 'date', label: 'One date' },
          ]}
        />
        {scope === 'date' ? (
          dates.length ? (
            <Select<string>
              label="Class date"
              value={date}
              onChange={setDate}
              options={dates.map((item) => ({
                value: item.date,
                label: formatDateWithWeekday(item.date),
                description: `${item.present} of ${item.total} present`,
              }))}
            />
          ) : (
            <Notice tone="info" message="There are no classes yet, so there is no date to export." />
          )
        ) : (
          <Text variant="small" tone="muted">
            Every class date, with each student&apos;s classes, presents and percentage.
          </Text>
        )}
      </View>

      {error ? <Notice tone="error" message={error} live /> : null}

      <Button
        label={Platform.OS === 'web' ? 'Download' : 'Export and share'}
        variant="primary"
        icon={Download}
        loading={busy}
        disabled={needsDate}
        onPress={download}
      />
    </View>
  );
}

export type ExportDialogProps = Omit<ExportFormProps, 'onDone'> & { open: boolean; onClose: () => void };

/** The page header's "Export" button opens this. */
export function ExportDialog({ open, onClose, ...form }: ExportDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Export attendance" description={`${form.courseCode}: download the attendance as a file.`}>
      <View className="pb-5">{open ? <ExportForm {...form} onDone={onClose} /> : null}</View>
    </Dialog>
  );
}
