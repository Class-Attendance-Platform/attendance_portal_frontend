import { useLocalSearchParams } from 'expo-router';
import { CircleStop, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useLoad } from '@/components/admin/hooks';
import { LoadBlock } from '@/components/admin/parts';
import { SemesterFormDialog, semesterDates, semesterState, useSemesterActions } from '@/components/admin/semester-dialogs';
import { SemesterCourses } from '@/components/admin/semester-courses';
import { SemesterPromote } from '@/components/admin/semester-promote';
import { SemesterRoster } from '@/components/admin/semester-roster';
import { Page } from '@/components/layout/Page';
import { Button, Notice, PageHeader, Pill, Tabs, useTab, type TabItem } from '@/components/ui';
import { adminApi, type Semester } from '@/lib/api';
import { levelTermLabel, plural } from '@/lib/format';

const TABS: TabItem[] = [
  { key: 'students', label: 'Students' },
  { key: 'courses', label: 'Courses' },
  { key: 'promote', label: 'Promote' },
];

/** /admin/semesters/[id]?tab=students|courses|promote */
export default function AdminSemester() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const tab = useTab(TABS);
  const semester = useLoad(() => adminApi.semester(id).then((r) => r.semester), [id]);
  const actions = useSemesterActions();
  const [editing, setEditing] = React.useState(false);

  const apply = (changed: Semester | null) => {
    if (!changed) return;
    semester.setData(changed);
    void semester.reload();
  };

  const header = (data: Semester | null) => {
    const state = data ? semesterState(data) : null;
    return (
      <PageHeader
        title={data?.label ?? 'Semester'}
        breadcrumb={[{ label: 'Semesters', href: '/admin/semesters' }, { label: data ? levelTermLabel(data.level, data.semester) : 'Semester' }]}
        meta={
          data
            ? `${state?.label} · ${semesterDates(data)} · ${plural(data.student_count, 'student')} · ${plural(data.course_count, 'course')}`
            : undefined
        }
        actions={
          data ? (
            data.deleted ? (
              <Button
                label="Restore"
                variant="primary"
                icon={RotateCcw}
                loading={actions.busy === `restore-${data.id}`}
                onPress={async () => apply(await actions.restore(data))}
              />
            ) : (
              <>
                <Button label="Edit" icon={Pencil} onPress={() => setEditing(true)} />
                {data.is_active ? (
                  <Button
                    label="Finish"
                    icon={CircleStop}
                    loading={actions.busy === `finish-${data.id}`}
                    onPress={async () => apply(await actions.finish(data))}
                  />
                ) : (
                  <Button
                    label="Reopen"
                    icon={RotateCcw}
                    loading={actions.busy === `reopen-${data.id}`}
                    onPress={async () => apply(await actions.reopen(data))}
                  />
                )}
                <Button
                  label="Delete"
                  variant="quiet"
                  destructive
                  icon={Trash2}
                  loading={actions.busy === `delete-${data.id}`}
                  onPress={async () => apply(await actions.remove(data))}
                />
              </>
            )
          ) : undefined
        }
      />
    );
  };

  return (
    <Page>
      {header(semester.data)}
      <LoadBlock state={semester} loadingLabel="Loading the semester…" errorTitle="Couldn't load this semester">
        {(data) => (
          <>
            <View className="flex-row flex-wrap gap-2">
              <Pill label={semesterState(data).label} tone={semesterState(data).tone} />
              <Pill label={`Session ${data.session || 'not set'}`} tone="neutral" />
            </View>
            {data.deleted ? (
              <Notice tone="warn" message="This semester is deleted: it is hidden from every list. Restore it to change it again." />
            ) : !data.is_active ? (
              <Notice
                tone="info"
                message="This semester is finished. Teachers can still correct attendance and take roll calls, but cannot start live or face sessions."
              />
            ) : null}
            <Tabs tabs={TABS} value={tab} label="Semester sections" />
            {tab === 'students' ? (
              <SemesterRoster semester={data} onChanged={() => void semester.reload()} />
            ) : tab === 'courses' ? (
              <SemesterCourses semester={data} onChanged={() => void semester.reload()} />
            ) : (
              <SemesterPromote semester={data} />
            )}
            <SemesterFormDialog
              open={editing}
              semester={data}
              onClose={() => setEditing(false)}
              onSaved={(changed) => apply(changed)}
            />
          </>
        )}
      </LoadBlock>
    </Page>
  );
}
