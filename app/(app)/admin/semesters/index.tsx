import { Link, type Href } from 'expo-router';
import { CalendarPlus, CalendarRange, CircleStop, RotateCcw, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useLoad } from '@/components/admin/hooks';
import { FilterBar, FilterItem, LoadBlock } from '@/components/admin/parts';
import { SemesterFormDialog, semesterDates, useSemesterActions } from '@/components/admin/semester-dialogs';
import { Page } from '@/components/layout/Page';
import { Button, Card, DataTable, EmptyState, PageHeader, Select, Text, TextLink, type Column } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { adminApi, type Semester } from '@/lib/api';
import { cn } from '@/lib/utils';
import { plural } from '@/lib/format';

type Show = 'all' | 'deleted';
const SHOW_OPTIONS: { label: string; value: Show }[] = [
  { label: 'Active and finished', value: 'all' },
  { label: 'Deleted', value: 'deleted' },
];

const semesterHref = (semester: Semester) => `/admin/semesters/${semester.id}` as Href;

/** /admin/semesters: active and finished semesters; create, finish, reopen, delete, restore. */
export default function AdminSemesters() {
  const { isDesktop } = useBreakpoint();
  const [show, setShow] = React.useState<Show>('all');
  const [creating, setCreating] = React.useState(false);
  const list = useLoad(() => adminApi.semesters(show).then((r) => r.semesters), [show]);
  const actions = useSemesterActions();

  const update = (changed: Semester | null) => {
    if (!changed) return;
    list.setData((rows) => {
      if (!rows) return rows;
      // Deleted ones leave the main view; restored ones leave the deleted view.
      if (changed.deleted !== (show === 'deleted')) return rows.filter((row) => row.id !== changed.id);
      return rows.map((row) => (row.id === changed.id ? changed : row));
    });
    // Order (active first) may change: fetch the list again quietly.
    void list.reload();
  };

  const rowButtons = (semester: Semester) =>
    semester.deleted ? (
      <Button
        label="Restore"
        icon={RotateCcw}
        compact
        accessibilityLabel={`Restore ${semester.label}`}
        loading={actions.busy === `restore-${semester.id}`}
        onPress={async () => update(await actions.restore(semester))}
      />
    ) : (
      <>
        {semester.is_active ? (
          <Button
            label="Finish"
            icon={CircleStop}
            compact
            accessibilityLabel={`Finish ${semester.label}`}
            loading={actions.busy === `finish-${semester.id}`}
            onPress={async () => update(await actions.finish(semester))}
          />
        ) : (
          <Button
            label="Reopen"
            icon={RotateCcw}
            compact
            accessibilityLabel={`Reopen ${semester.label}`}
            loading={actions.busy === `reopen-${semester.id}`}
            onPress={async () => update(await actions.reopen(semester))}
          />
        )}
        <Button
          label="Delete"
          variant="quiet"
          destructive
          icon={Trash2}
          compact
          accessibilityLabel={`Delete ${semester.label}`}
          loading={actions.busy === `delete-${semester.id}`}
          onPress={async () => update(await actions.remove(semester))}
        />
      </>
    );

  const title = (semester: Semester) =>
    semester.deleted ? (
      <Text weight="semibold">{semester.label}</Text>
    ) : (
      <Link href={semesterHref(semester)} asChild>
        <TextLink label={semester.label} accessibilityLabel={`Open ${semester.label}`} />
      </Link>
    );

  const columns: Column<Semester>[] = [
    { key: 'label', title: 'Semester', flex: 2.4, render: title },
    { key: 'dates', title: 'Dates', flex: 2, render: (row) => <Text tone={row.start_date || row.end_date ? 'default' : 'muted'}>{semesterDates(row)}</Text> },
    { key: 'students', title: 'Students', width: 84, align: 'right', render: (row) => String(row.student_count) },
    { key: 'courses', title: 'Courses', width: 80, align: 'right', render: (row) => String(row.course_count) },
    {
      key: 'actions',
      title: '',
      width: 220,
      align: 'right',
      render: (row) => <View className="flex-row flex-wrap justify-end gap-2">{rowButtons(row)}</View>,
    },
  ];

  const table = (rows: Semester[], label: string) =>
    isDesktop ? (
      <DataTable label={label} columns={columns} rows={rows} rowKey={(row) => row.id} />
    ) : (
      <View role="list" accessibilityLabel={label}>
        {rows.map((row, index) => (
          <View key={row.id} role="listitem" className={cn('gap-2 px-4 py-4', index > 0 && 'border-t border-border')}>
            <View className="items-start">{title(row)}</View>
            <Text variant="small" tone="muted">
              {semesterDates(row)} · {plural(row.student_count, 'student')} · {plural(row.course_count, 'course')}
            </Text>
            <View className="mt-1 flex-row flex-wrap gap-2">{rowButtons(row)}</View>
          </View>
        ))}
      </View>
    );

  return (
    <Page>
      <PageHeader
        title="Semesters"
        meta="One active semester per level. Finished semesters keep their history."
        actions={<Button label="New semester" variant="primary" icon={CalendarPlus} onPress={() => setCreating(true)} />}
      />

      <FilterBar>
        <FilterItem>
          <Select label="Show" hideLabel value={show} options={SHOW_OPTIONS} onChange={setShow} />
        </FilterItem>
      </FilterBar>

      <LoadBlock state={list} loadingLabel="Loading semesters…">
        {(semesters) => {
          if (show === 'deleted') {
            return (
              <Card title="Deleted" titleNote={`(${semesters.length})`} padded={false}>
                <View className="mt-3">
                  {semesters.length ? (
                    table(semesters, 'Deleted semesters')
                  ) : (
                    <EmptyState title="No deleted semesters" message="Semesters you delete show here, so you can restore them." />
                  )}
                </View>
              </Card>
            );
          }
          if (!semesters.length) {
            return (
              <Card>
                <EmptyState
                  icon={CalendarRange}
                  title="No semesters yet"
                  message="Create a semester for each level that has classes. Then add its students and courses."
                  action={{ label: 'New semester', icon: CalendarPlus, onPress: () => setCreating(true) }}
                />
              </Card>
            );
          }
          const active = semesters.filter((row) => row.is_active);
          const finished = semesters.filter((row) => !row.is_active);
          return (
            <>
              <Card title="Active" titleNote={`(${active.length})`} padded={false}>
                <View className="mt-3">
                  {active.length ? (
                    table(active, 'Active semesters')
                  ) : (
                    <EmptyState title="No active semester" message="Create one, or reopen a finished semester." />
                  )}
                </View>
              </Card>
              <Card title="Finished" titleNote={`(${finished.length})`} padded={false}>
                <View className="mt-3">
                  {finished.length ? (
                    table(finished, 'Finished semesters')
                  ) : (
                    <EmptyState title="No finished semesters yet" message="A semester is finished when you finish it or promote its students." />
                  )}
                </View>
              </Card>
            </>
          );
        }}
      </LoadBlock>

      <SemesterFormDialog
        open={creating}
        semester={null}
        onClose={() => setCreating(false)}
        onSaved={() => {
          if (show !== 'all') setShow('all');
          else void list.reload();
        }}
      />
    </Page>
  );
}
