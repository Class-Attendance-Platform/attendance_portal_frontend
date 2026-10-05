import { CircleCheck, Download, FileSpreadsheet, FileUp, RefreshCw, Upload } from 'lucide-react-native';
import * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { canSaveFiles, saveTextFile, toCsv } from '@/components/admin/files';
import { useLoad } from '@/components/admin/hooks';
import { FormError } from '@/components/admin/parts';
import { Page } from '@/components/layout/Page';
import {
  Button,
  Card,
  DataTable,
  Icon,
  ListRow,
  Notice,
  PageHeader,
  Pill,
  Select,
  Text,
  useConfirm,
  useMessage,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { adminApi, type ApiError, type ImportResult, type ImportRow } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { todayISO } from '@/lib/dates';
import { plural } from '@/lib/format';

const COLUMNS: { name: string; required: boolean; about: string }[] = [
  { name: 'student_id', required: true, about: 'University roll number, e.g. 2302001' },
  { name: 'name', required: false, about: 'Full name (or two columns: first_name and last_name)' },
  { name: 'email', required: true, about: 'Their email address; it is also their sign-in' },
  { name: 'level', required: true, about: 'First, Second, Third or Fourth (1–4 also works)' },
  { name: 'term', required: true, about: 'I or II (1 or 2 also works)' },
];

const SAMPLE = [
  ['student_id', 'name', 'email', 'level', 'term'],
  ['2302001', 'Ayesha Rahman', 'ayesha.rahman@example.com', 'Third', 'I'],
  ['2302002', 'Tanvir Hasan', 'tanvir.hasan@example.com', '3', '1'],
];

type ChosenFile = { blob: Blob; name: string; size: number };

/** Web: opens the browser's file chooser for one .csv or .xlsx file. */
function chooseFile(): Promise<ChosenFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? { blob: file, name: file.name, size: file.size } : null);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

const fileSize = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function StatusCell({ row }: { row: ImportRow }) {
  return (
    <View className="items-start gap-1">
      {row.status === 'create' ? (
        <Pill label="Will be added" tone="present" />
      ) : row.status === 'exists' ? (
        <Pill label="Already exists" tone="neutral" />
      ) : (
        <Pill label="Error" tone="absent" />
      )}
      {row.errors.map((error) => (
        <Text key={error} variant="small" tone="absent">
          {error}
        </Text>
      ))}
    </View>
  );
}

/** /admin/students/import: a .csv / .xlsx file → dry run → apply → temporary passwords once. */
export default function AdminStudentImport() {
  const { isDesktop } = useBreakpoint();
  const confirm = useConfirm();
  const message = useMessage();
  const semesters = useLoad(() => adminApi.semesters('active').then((r) => r.semesters), []);
  const [file, setFile] = React.useState<ChosenFile | null>(null);
  const [semesterId, setSemesterId] = React.useState('');
  const [preview, setPreview] = React.useState<ImportResult | null>(null);
  const [applied, setApplied] = React.useState<ImportResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const web = Platform.OS === 'web';

  async function pick() {
    const chosen = await chooseFile();
    if (!chosen) return;
    setFile(chosen);
    setPreview(null);
    setApplied(null);
    setError(null);
  }

  async function check(current = file) {
    if (!current) return;
    setChecking(true);
    setError(null);
    try {
      setPreview(await adminApi.importStudents({ file: { blob: current.blob, name: current.name } }));
    } catch (caught) {
      setPreview(null);
      setError(toApiError(caught));
    } finally {
      setChecking(false);
    }
  }

  async function apply() {
    if (!file || !preview) return;
    const semester = semesters.data?.find((row) => row.id === semesterId);
    const ok = await confirm({
      title: `Add ${plural(preview.summary.create, 'student')}?`,
      message: `Their accounts are approved at once, each with a temporary password shown on the next screen only once.${
        semester ? ` They are also added to ${semester.label}.` : ''
      }${preview.summary.exists + preview.summary.error ? ' Rows that already exist or have errors are skipped.' : ''}`,
      confirmLabel: 'Add students',
    });
    if (!ok) return;
    setApplying(true);
    setError(null);
    try {
      const result = await adminApi.importStudents({ file: { blob: file.blob, name: file.name }, apply: true, semesterId: semesterId || undefined });
      setApplied(result);
      setPreview(null);
      message.success(`${plural(result.created?.length ?? 0, 'student')} added.`);
    } catch (caught) {
      const problem = toApiError(caught);
      if (problem.code === 'conflict') {
        message.error(problem.message);
        void check();
      } else {
        setError(problem);
      }
    } finally {
      setApplying(false);
    }
  }

  function downloadPasswords() {
    if (!applied) return;
    const created = applied.created ?? [];
    saveTextFile(
      `new-student-passwords-${todayISO()}.csv`,
      toCsv(['student_id', 'email', 'temporary_password'], created.map((row) => [row.student_id, row.email, row.temporary_password]))
    );
  }

  function startOver() {
    setFile(null);
    setPreview(null);
    setApplied(null);
    setError(null);
  }

  const previewColumns: Column<ImportRow>[] = [
    { key: 'row', title: 'Row', width: 52, align: 'right', render: (row) => <Text tabular>{String(row.row)}</Text> },
    { key: 'student_id', title: 'Student ID', width: 100, render: (row) => (row.student_id === null ? '—' : String(row.student_id)) },
    { key: 'name', title: 'Name', flex: 1.4, render: (row) => row.name || '—' },
    { key: 'email', title: 'Email', flex: 1.8, render: (row) => row.email || '—' },
    { key: 'level', title: 'Level', width: 76, render: (row) => row.level || '—' },
    { key: 'term', title: 'Term', width: 56, render: (row) => row.term || '—' },
    { key: 'status', title: 'Status', flex: 1.6, render: (row) => <StatusCell row={row} /> },
  ];

  const createdRows = applied?.created ?? [];
  const appliedSemester = semesters.data?.find((row) => row.id === semesterId)?.label ?? null;
  const semesterOptions = [
    { label: "Don't add to a semester", value: '' },
    ...(semesters.data ?? []).map((row) => ({ label: row.label, value: row.id, description: `${plural(row.student_count, 'student')} now` })),
  ];

  return (
    <Page>
      <PageHeader
        title="Import students"
        breadcrumb={[{ label: 'Students', href: '/admin/students' }, { label: 'Import' }]}
        meta="Add many students at once from a CSV or Excel (.xlsx) file."
      />

      {applied ? (
        <Card title="Students added" titleNote={`(${createdRows.length})`} className="gap-4">
          <Notice
            tone="warn"
            title="Shown only once"
            message={
              canSaveFiles
                ? 'These temporary passwords are not shown again. Download them now and give each student theirs privately (not in a group chat).'
                : 'These temporary passwords are not shown again. Note them now and give each student theirs privately (not in a group chat).'
            }
          />
          {createdRows.length && appliedSemester ? <Text>They were added to {appliedSemester}.</Text> : null}
          {createdRows.length ? (
            isDesktop ? (
              <View className="overflow-hidden rounded-control border border-border">
                <DataTable
                  label="New accounts and temporary passwords"
                  rows={createdRows}
                  rowKey={(row) => String(row.student_id)}
                  columns={[
                    { key: 'student_id', title: 'Student ID', width: 120, render: (row) => <Text tabular>{String(row.student_id)}</Text> },
                    { key: 'email', title: 'Email', flex: 2, render: (row) => <Text selectable>{row.email}</Text> },
                    {
                      key: 'password',
                      title: 'Temporary password',
                      flex: 1.2,
                      render: (row) => (
                        <Text selectable weight="semibold" tabular>
                          {row.temporary_password}
                        </Text>
                      ),
                    },
                  ]}
                />
              </View>
            ) : (
              <View className="rounded-control border border-border">
                {createdRows.map((row, index) => (
                  <ListRow key={row.student_id} divider={index > 0} title={row.email} subtitle={`Student ID ${row.student_id}`}>
                    <Text selectable weight="semibold" tabular>
                      {row.temporary_password}
                    </Text>
                  </ListRow>
                ))}
              </View>
            )
          ) : (
            <Text tone="muted">No accounts were added: every row already existed or had an error.</Text>
          )}
          <View className="flex-row flex-wrap gap-2">
            {canSaveFiles && createdRows.length ? (
              <Button label="Download as CSV" variant="primary" icon={Download} onPress={downloadPasswords} />
            ) : null}
            <Button label="Import another file" icon={RefreshCw} onPress={startOver} />
          </View>
        </Card>
      ) : (
        <>
          <View className={isDesktop ? 'flex-row items-start gap-5' : 'gap-4'}>
            <View className={isDesktop ? 'flex-[3]' : undefined}>
              <Card title="1. Choose the file" className="gap-4">
                {web ? (
                  <>
                    <View className="flex-row flex-wrap items-center gap-3">
                      <Button label={file ? 'Choose another file' : 'Choose a file'} icon={FileUp} onPress={pick} variant={file ? 'secondary' : 'primary'} />
                      {file ? (
                        <View className="flex-row items-center gap-2">
                          <Icon as={FileSpreadsheet} size={20} color="primary" />
                          <Text weight="semibold">{file.name}</Text>
                          <Text tone="muted">{fileSize(file.size)}</Text>
                        </View>
                      ) : (
                        <Text tone="muted">A .csv or .xlsx file, up to 2 MB and 1000 rows.</Text>
                      )}
                    </View>
                    <Select
                      label="Also add them to a semester"
                      value={semesterId}
                      options={semesterOptions}
                      onChange={setSemesterId}
                      hint="Optional. The new students join this semester's class list."
                    />
                    <Button label="Check the file" variant={file ? 'primary' : 'secondary'} icon={CircleCheck} loading={checking} disabled={!file} onPress={() => check()} />
                  </>
                ) : (
                  <Notice
                    tone="info"
                    message="Importing a file works in the web app and the desktop app. Open the portal in a browser on a computer to import students."
                  />
                )}
                <FormError error={error} />
              </Card>
            </View>
            <View className={isDesktop ? 'flex-[2]' : undefined}>
              <Card title="What the file needs" className="gap-4">
                <Text tone="muted">
                  The first row names the columns, in any order. Each other row is one student. Accounts are approved at once and
                  get a random temporary password.
                </Text>
                <View className="rounded-control border border-border">
                  {COLUMNS.map((column, index) => (
                    <View
                      key={column.name}
                      className={`flex-row flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 ${index > 0 ? 'border-t border-border' : ''}`}
                    >
                      <Text weight="semibold" style={{ minWidth: 92 }}>
                        {column.name}
                      </Text>
                      <Text tone="muted" className="flex-1" style={{ minWidth: 200 }}>
                        {column.about}
                        {column.required ? '' : ' (optional)'}
                      </Text>
                    </View>
                  ))}
                </View>
                <View className="gap-2">
                  <Text variant="small" weight="semibold" tone="muted">
                    Sample
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    className="rounded-control border border-border bg-bg"
                    contentContainerClassName="p-3"
                    accessibilityLabel="Sample file"
                  >
                    <View>
                      {SAMPLE.map((line) => (
                        <Text key={line.join(',')} variant="small" selectable numberOfLines={1} style={{ fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined }}>
                          {line.join(',')}
                        </Text>
                      ))}
                    </View>
                  </ScrollView>
                  {canSaveFiles ? (
                    <Button
                      label="Download the sample"
                      variant="quiet"
                      icon={Download}
                      onPress={() => saveTextFile('students-sample.csv', toCsv(SAMPLE[0], SAMPLE.slice(1)))}
                    />
                  ) : null}
                </View>
              </Card>
            </View>
          </View>

          {preview ? (
            <Card title="2. Check and add" className="gap-4">
              <View className="flex-row flex-wrap gap-2">
                <Pill label={`${preview.summary.create} to add`} tone="present" />
                <Pill label={`${preview.summary.exists} already exist`} tone="neutral" />
                <Pill label={`${preview.summary.error} with errors`} tone={preview.summary.error ? 'absent' : 'neutral'} />
              </View>
              {preview.summary.error ? (
                <Notice
                  tone="warn"
                  message="Rows with errors are skipped. Fix them in the file and check it again, or add the other rows now."
                />
              ) : null}
              {preview.rows.length ? (
                isDesktop ? (
                  <View className="overflow-hidden rounded-control border border-border">
                    <DataTable label="Rows in the file" rows={preview.rows} rowKey={(row) => String(row.row)} columns={previewColumns} />
                  </View>
                ) : (
                  <View className="rounded-control border border-border">
                    {preview.rows.map((row, index) => (
                      <ListRow
                        key={row.row}
                        divider={index > 0}
                        title={row.name || row.email || `Row ${row.row}`}
                        subtitle={`Row ${row.row} · ${row.student_id ?? 'no ID'} · ${[row.level, row.term].filter(Boolean).join(' · ') || 'no level'}`}
                      >
                        {row.email ? (
                          <Text variant="small" tone="muted">
                            {row.email}
                          </Text>
                        ) : null}
                        <StatusCell row={row} />
                      </ListRow>
                    ))}
                  </View>
                )
              ) : (
                <Text tone="muted">The file has no student rows.</Text>
              )}
              <Button
                label={preview.summary.create ? `Add ${plural(preview.summary.create, 'student')}` : 'Nothing to add'}
                variant="primary"
                icon={Upload}
                disabled={!preview.summary.create}
                loading={applying}
                onPress={apply}
              />
            </Card>
          ) : null}
        </>
      )}
    </Page>
  );
}
