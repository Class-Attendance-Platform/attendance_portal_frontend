import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { CheckCheck, Save, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DateField } from '@/components/ui/date-field';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { AttendanceToggle } from '@/components/teacher/choice-group';
import { courseHref, enrolledOn, param } from '@/components/teacher/labels';
import { membershipNote } from '@/components/teacher/students-tab';
import { useLoad } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { isApiError } from '@/lib/api/client';
import { sessionsApi } from '@/lib/api/sessions';
import { teacherApi } from '@/lib/api/teacher';
import type { AttendanceStatus, UUID } from '@/lib/api/types';
import { isFutureDate, parseISODate, todayISO } from '@/lib/dates';
import { formatDate, formatDateWithWeekday } from '@/lib/format';
import { cn } from '@/lib/utils';

type Row = { profile_id: UUID; student_id: number; name: string; joined_at: string | null; left_at: string | null };

/** /teacher/courses/[courseInfoId]/roll-call?date=: mark each student for a date (adds or corrects that class). */
export default function TeacherRollCall() {
  const params = useLocalSearchParams<{ courseInfoId: string; date?: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const asked = param(params.date);
  const badDate = !!asked && (!parseISODate(asked) || isFutureDate(asked));
  const date = asked && !badDate ? asked : todayISO();

  const { isDesktop } = useBreakpoint();
  const message = useMessage();
  const confirm = useConfirm();

  const course = useLoad(() => teacherApi.course(courseInfoId), [courseInfoId]);
  const day = useLoad(async () => (await sessionsApi.history(courseInfoId, { date })).history[0] ?? null, [courseInfoId, date]);

  const [marks, setMarks] = React.useState<Record<UUID, AttendanceStatus>>({});
  const [initial, setInitial] = React.useState<Record<UUID, AttendanceStatus>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<string | null>(null);

  // Everyone who was a member on the date, plus anyone who already has a record that day.
  const rows: Row[] = React.useMemo(() => {
    if (!course.data || day.loading) return [];
    const list: Row[] = course.data.students.filter((student) => enrolledOn(student, date));
    const known = new Set(list.map((student) => student.profile_id));
    for (const log of day.data?.logs ?? []) {
      if (!known.has(log.profile_id)) {
        list.push({ profile_id: log.profile_id, student_id: log.student_id, name: log.name, joined_at: null, left_at: null });
      }
    }
    return list.sort((a, b) => a.student_id - b.student_id);
  }, [course.data, day.data, day.loading, date]);

  // Pre-fill from the date's records (a new class starts with everyone absent).
  React.useEffect(() => {
    if (!course.data || day.loading) return;
    const byStudent = new Map((day.data?.logs ?? []).map((log) => [log.profile_id, log.status]));
    const start: Record<UUID, AttendanceStatus> = {};
    for (const row of rows) start[row.profile_id] = byStudent.get(row.profile_id) ?? 'ABSENT';
    setMarks(start);
    setInitial(start);
  }, [rows, course.data, day.data, day.loading]);

  const presentCount = rows.filter((row) => marks[row.profile_id] === 'PRESENT').length;
  const absentCount = rows.length - presentCount;
  const changes = rows.filter((row) => marks[row.profile_id] !== initial[row.profile_id]).length;
  const hasClass = !!day.data;

  async function changeDate(next: string) {
    if (next === date) return;
    if (changes > 0) {
      const ok = await confirm({
        title: 'Discard your changes?',
        message: `You changed ${changes} ${changes === 1 ? 'student' : 'students'} on ${formatDate(date)} without saving.`,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        destructive: true,
      });
      if (!ok) return;
    }
    setSaved(null);
    router.setParams({ date: next });
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const result = await teacherApi.rollCall(courseInfoId, {
        date,
        present_profile_ids: rows.filter((row) => marks[row.profile_id] === 'PRESENT').map((row) => row.profile_id),
      });
      const summary = `Saved ${formatDate(result.date)}: ${result.present} present, ${result.absent} absent${
        hasClass ? ` (${result.changed} changed)` : ''
      }.`;
      message.success(summary);
      setSaved(summary);
      await Promise.all([day.reload({ quiet: true }), course.reload({ quiet: true })]);
    } catch (caught) {
      message.error(isApiError(caught) ? caught.message : 'Could not save the roll call. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const info = course.data?.course;
  const breadcrumb = [
    { label: 'My courses', href: '/teacher' as Href },
    { label: info?.code ?? 'Course', href: courseHref(courseInfoId) },
    { label: 'Roll call' },
  ];

  const loadError = course.error ?? day.error;
  const loading = course.loading || day.loading;

  return (
    <Page>
      <PageHeader
        title="Roll call"
        breadcrumb={breadcrumb}
        meta={info ? `${info.code} · ${info.title}` : undefined}
      />

      <Card className="gap-4">
        <View style={{ maxWidth: 360 }}>
          <DateField label="Class date" value={date} onChange={changeDate} noFuture hint="One date counts as one class." />
        </View>
        {badDate ? <Notice tone="warn" message="That date was not valid or is in the future, so today is shown." /> : null}
        {!loading && !loadError ? (
          hasClass ? (
            <Notice
              tone="info"
              title={`${formatDateWithWeekday(date)} already has a class`}
              message="The switches show what was saved. Saving changes only the students you switch; how they checked in is kept."
            />
          ) : (
            <Notice
              tone="info"
              title={`No class on ${formatDateWithWeekday(date)} yet`}
              message="Saving adds a class for this date. Everyone starts as absent: tap Present for each student, or Mark all present."
            />
          )
        ) : null}
        {saved ? (
          <Notice tone="success" message={saved}>
            <Link href={courseHref(courseInfoId, 'history', { date })} asChild>
              <Button label="See it in History" compact />
            </Link>
          </Notice>
        ) : null}
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading the class list…" />
        </Card>
      ) : loadError ? (
        <Card>
          <ErrorState
            message={loadError.message}
            onRetry={() => {
              void course.reload();
              void day.reload();
            }}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No students on this date"
            message="No one was in this course's class list on that date. Pick another date."
          />
        </Card>
      ) : (
        <Card
          padded={false}
          title="Class list"
          titleNote={`${presentCount} present · ${absentCount} absent`}
          actions={
            <Button
              label="Mark all present"
              icon={CheckCheck}
              compact
              disabled={saving || presentCount === rows.length}
              onPress={() => setMarks(Object.fromEntries(rows.map((row) => [row.profile_id, 'PRESENT' as const])))}
            />
          }
          className="pb-2"
        >
          <View className="mt-3">
            {rows.map((row, index) => {
              const note = membershipNote(row);
              return (
                <View
                  key={row.profile_id}
                  className={cn(
                    'min-h-[60px] flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5',
                    isDesktop ? 'px-5' : 'px-4',
                    index > 0 && 'border-t border-border'
                  )}
                >
                  <View className="min-w-[180px] flex-1 gap-0.5">
                    <Text weight="semibold">{row.name}</Text>
                    <Text variant="small" tone="muted" tabular>
                      {row.student_id}
                      {note ? ` · ${note}` : ''}
                    </Text>
                  </View>
                  <AttendanceToggle
                    name={row.name}
                    value={marks[row.profile_id] ?? null}
                    disabled={saving}
                    onChange={(status) => setMarks((current) => ({ ...current, [row.profile_id]: status }))}
                  />
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {!loading && !loadError && rows.length ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <Text tone="muted">
            {hasClass ? `${changes} ${changes === 1 ? 'change' : 'changes'} to save` : `${presentCount} present, ${absentCount} absent`}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <Link href={courseHref(courseInfoId)} asChild>
              <Button label="Back to the course" />
            </Link>
            <Button
              label={hasClass ? 'Save changes' : 'Save roll call'}
              variant="primary"
              icon={Save}
              loading={saving}
              disabled={hasClass && changes === 0}
              onPress={save}
            />
          </View>
        </View>
      ) : null}
    </Page>
  );
}
