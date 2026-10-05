import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { CheckCheck, Radio, Save, Users } from 'lucide-react-native';
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
import { courseHref, isFinished, liveHref, param } from '@/components/teacher/labels';
import { membershipNote } from '@/components/teacher/students-tab';
import { useLoad } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { isApiError } from '@/lib/api/client';
import { TEACHER_ERRORS, teacherApi, type RollCallList, type RollCallStudent } from '@/lib/api/teacher';
import type { AttendanceStatus, UUID } from '@/lib/api/types';
import { isFutureDate, parseISODate, todayISO } from '@/lib/dates';
import { formatDate, formatDateWithWeekday } from '@/lib/format';
import { cn } from '@/lib/utils';

type Marks = Record<UUID, AttendanceStatus>;

/** The saved status of each student on the list (no record yet = absent). */
function savedMarks(list: RollCallList | null): Marks {
  return Object.fromEntries((list?.students ?? []).map((row) => [row.profile_id, row.status ?? 'ABSENT']));
}

/** /teacher/courses/[courseInfoId]/roll-call?date=: mark each student for a date (adds or corrects that class). */
export default function TeacherRollCall() {
  const params = useLocalSearchParams<{ courseInfoId: string; date?: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const asked = param(params.date);
  const badDate = !!asked && (!parseISODate(asked) || isFutureDate(asked));

  const { isDesktop } = useBreakpoint();
  const message = useMessage();
  const confirm = useConfirm();

  const course = useLoad(() => teacherApi.course(courseInfoId), [courseInfoId], { refreshOnFocus: true });
  // Without a date: today, or for a finished semester its newest class (nobody is enrolled today).
  const newestClass = course.data && isFinished(course.data.course) ? course.data.dates[0]?.date : undefined;
  const date = asked && !badDate ? asked : newestClass ?? todayISO();
  // Who the roll call covers on that date (students who left since too), with what was saved.
  // Reloaded when the page comes back into view, so a session or correction made meanwhile shows.
  const list = useLoad(() => teacherApi.rollCallList(courseInfoId, date), [courseInfoId, date], { refreshOnFocus: true });

  const [marks, setMarks] = React.useState<Marks>({});
  const [initial, setInitial] = React.useState<Marks>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  // Start from what is saved. When the list loads again (Back to this page, or after a refused
  // save), students the teacher already switched keep the switch; the others show the new status.
  const marksRef = React.useRef({ marks, initial });
  marksRef.current = { marks, initial };
  React.useEffect(() => {
    const fresh = savedMarks(list.data);
    const { marks: before, initial: beforeInitial } = marksRef.current;
    const next: Marks = {};
    for (const [id, status] of Object.entries(fresh)) {
      next[id] = id in before && before[id] !== beforeInitial[id] ? before[id] : status;
    }
    setInitial(fresh);
    setMarks(next);
  }, [list.data]);

  // A new date starts clean.
  React.useEffect(() => {
    setMarks({});
    setInitial({});
    setProblem(null);
  }, [date]);

  const rows: RollCallStudent[] = list.data?.students ?? [];
  const hasClass = !!list.data?.has_class;
  const liveSessionId = list.data?.live_session_id ?? null;
  const presentCount = rows.filter((row) => marks[row.profile_id] === 'PRESENT').length;
  const absentCount = rows.length - presentCount;
  const changes = rows.filter((row) => marks[row.profile_id] !== initial[row.profile_id]).length;

  useLeaveGuard(changes > 0 && !saving, {
    title: 'Discard your changes?',
    message: `You changed ${changes} ${changes === 1 ? 'student' : 'students'} on ${formatDate(date)} without saving.`,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
  });

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
    if (!list.data) return;
    setSaving(true);
    setSaved(null);
    setProblem(null);
    try {
      const result = await teacherApi.rollCall(courseInfoId, {
        date,
        present_profile_ids: rows.filter((row) => marks[row.profile_id] === 'PRESENT').map((row) => row.profile_id),
        // The server refuses if the date changed since this list was loaded (nothing is overwritten).
        version: list.data.version,
      });
      const summary = `Saved ${formatDate(result.date)}: ${result.present} present, ${result.absent} absent${
        result.changed ? ` (${result.changed} changed)` : ''
      }.`;
      message.success(summary);
      setSaved(summary);
      await Promise.all([list.reload({ quiet: true }), course.reload({ quiet: true })]);
    } catch (caught) {
      if (isApiError(caught) && (caught.code === TEACHER_ERRORS.dateChanged || caught.code === TEACHER_ERRORS.sessionRunning)) {
        // Show what is saved now; the teacher's own switches stay. The message bar says it where
        // the teacher is (by the Save button); the notice at the top keeps it.
        setProblem(caught.message);
        message.error(caught.message);
        await list.reload({ quiet: true });
      } else {
        message.error(isApiError(caught) ? caught.message : 'Could not save the roll call. Please try again.');
      }
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

  const loadError = list.error ?? course.error;
  const loading = list.loading || (course.loading && !asked);

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
          liveSessionId ? (
            <Notice
              tone="warn"
              title="A live session is running on this date"
              message="Mark students present in the session instead. You can correct this date here after it ends."
            >
              <Link href={liveHref(liveSessionId, courseInfoId)} asChild>
                <Button label="Open the live session" icon={Radio} compact />
              </Link>
            </Notice>
          ) : hasClass ? (
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
        {problem ? (
          <Notice tone="warn" live title="Not saved" message={problem} />
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
              void list.reload();
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
              disabled={saving || !!liveSessionId || presentCount === rows.length}
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
                    disabled={saving || !!liveSessionId}
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
              disabled={!!liveSessionId || (hasClass && changes === 0)}
              onPress={save}
            />
          </View>
        </View>
      ) : null}
    </Page>
  );
}
