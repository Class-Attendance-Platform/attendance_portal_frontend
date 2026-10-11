import { Link, router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { CalendarX2, CheckCheck, Radio, Save, Users } from 'lucide-react-native';
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
import { courseHref, isFinished, param } from '@/components/teacher/labels';
import { CourseLoadError, isFinalError } from '@/components/teacher/load-error';
import {
  defaultRollCallDate,
  isDateParam,
  keepSwitches,
  rollCallIds,
  rollCallRange,
  startingMarks,
  type Mark,
} from '@/components/teacher/rules';
import { membershipNote } from '@/components/teacher/students-tab';
import { useLoad } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { isApiError } from '@/lib/api/client';
import { TEACHER_ERRORS, teacherApi, type RollCallStudent } from '@/lib/api/teacher';
import type { UUID } from '@/lib/api/types';
import { isFutureDate, todayISO } from '@/lib/dates';
import { formatDate, formatDateWithWeekday, plural } from '@/lib/format';
import { cn } from '@/lib/utils';

type Marks = Record<UUID, Mark>;

/** /teacher/courses/[courseInfoId]/roll-call?date=: mark each student for a date (adds or corrects that class). */
export default function TeacherRollCall() {
  const params = useLocalSearchParams<{ courseInfoId: string; date?: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const asked = param(params.date);
  // Exactly YYYY-MM-DD (a time part would reach the server as it is) and not in the future.
  const badDate = !!asked && (!isDateParam(asked) || isFutureDate(asked));

  const { isDesktop } = useBreakpoint();
  const message = useMessage();
  const confirm = useConfirm();
  const navigation = useNavigation();

  const course = useLoad(() => teacherApi.course(courseInfoId), [courseInfoId], { refreshOnFocus: true });
  // The semester's dates: the date field offers only those (the server refuses others).
  const range = course.data ? rollCallRange(course.data.course.semester) : null;
  // Without a date: today, or for a finished semester its newest class (nobody is enrolled today).
  const today = todayISO();
  const fallback =
    course.data && range
      ? defaultRollCallDate(isFinished(course.data.course), course.data.dates.map((item) => item.date), range, today)
      : today;
  const date = asked && !badDate ? asked : fallback;
  // For the "Left" notes (students who left since this date).
  const newestClass = course.data?.dates[0]?.date;
  const semesterActive = !!course.data?.course.semester.is_active;
  // Who the roll call covers on that date (students who left since too), with what was saved.
  // Reloaded when the page comes back into view, so a session or correction made meanwhile shows.
  const list = useLoad(() => teacherApi.rollCallList(courseInfoId, date), [courseInfoId, date], { refreshOnFocus: true });

  const [marks, setMarks] = React.useState<Marks>({});
  const [initial, setInitial] = React.useState<Marks>({});
  const [saving, setSaving] = React.useState(false);
  // The last save's summary and its date: the notice shows only on that date.
  const [saved, setSaved] = React.useState<{ text: string; date: string } | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  // Start from what is saved. When the list loads again (Back to this page, or after a refused
  // save), students the teacher already switched keep the switch; the others show the new status.
  const marksRef = React.useRef({ marks, initial });
  marksRef.current = { marks, initial };
  React.useEffect(() => {
    const fresh = startingMarks(list.data?.students ?? [], !!list.data?.has_class);
    setInitial(fresh);
    setMarks(keepSwitches(fresh, marksRef.current.marks, marksRef.current.initial));
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
  const absentCount = rows.filter((row) => marks[row.profile_id] === 'ABSENT').length;
  // On a date that has a class, students with no mark yet (e.g. who joined after it) stay so
  // unless the teacher picks Present or Absent for them.
  const unmarkedCount = rows.filter((row) => marks[row.profile_id] === null).length;
  const unmarkedSaved = hasClass ? rows.filter((row) => row.status === null).length : 0;
  const changes = rows.filter((row) => marks[row.profile_id] !== initial[row.profile_id]).length;

  useLeaveGuard(changes > 0 && !saving, {
    title: 'Discard your changes?',
    message: `You changed ${changes} ${changes === 1 ? 'student' : 'students'} on ${formatDate(date)} without saving.`,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
  });

  async function changeDate(next: string) {
    // The date stays while a save runs: its result belongs to this date.
    if (saving || next === date) return;
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
        // Students with no mark are in neither list: the server leaves them as they are.
        ...rollCallIds(rows, marks),
        // The server refuses if the date changed since this list was loaded (nothing is overwritten).
        version: list.data.version,
      });
      const summary = `Saved ${formatDate(result.date)}: ${result.present} present, ${result.absent} absent${
        result.changed ? ` (${result.changed} changed)` : ''
      }.${result.unmarked ? ` ${plural(result.unmarked, 'student has', 'students have')} no mark yet.` : ''}`;
      // What was sent is saved now (the switches are off while saving), even if the reload
      // below fails: nothing is left to save and leaving does not ask.
      setInitial(marks);
      message.success(summary);
      setSaved({ text: summary, date: result.date });
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

  // Back to the course page underneath as it was left (its tab and date), asking first when
  // there are changes. Opened another way (a link, another page): to the course page.
  function backToCourse() {
    const state = navigation.getState();
    const below = state && state.index > 0 ? state.routes[state.index - 1] : undefined;
    const params = below?.params as { courseInfoId?: string } | undefined;
    if (below?.name === 'courses/[courseInfoId]/index' && params?.courseInfoId === courseInfoId) router.back();
    else router.dismissTo(courseHref(courseInfoId));
  }

  const info = course.data?.course;
  const breadcrumb = [
    { label: 'My courses', href: '/teacher' as Href },
    { label: info?.code ?? 'Course', href: courseHref(courseInfoId) },
    { label: 'Roll call' },
  ];

  // Another teacher's course or a missing one: nothing on this page can help (no date, no retry).
  const finalError = isFinalError(list.error) ? list.error : isFinalError(course.error) ? course.error : null;
  if (finalError) {
    return (
      <Page>
        <PageHeader title="Roll call" breadcrumb={breadcrumb} />
        <CourseLoadError error={finalError} title="Couldn't load the class list" onRetry={() => void list.reload()} />
      </Page>
    );
  }

  const loadError = list.error ?? course.error;
  // A date the server refuses (outside the semester, or in the future): pick another one above.
  const dateError = list.error?.status === 400 ? list.error : null;
  const loading = list.loading || (course.loading && !asked);
  const ready = !loading && !loadError;

  return (
    <Page>
      <PageHeader
        title="Roll call"
        breadcrumb={breadcrumb}
        meta={info ? `${info.code} · ${info.title}` : undefined}
      />

      <Card className="gap-4">
        <View style={{ maxWidth: 360 }}>
          <DateField
            label="Class date"
            value={date}
            onChange={changeDate}
            noFuture
            minDate={range?.start ?? undefined}
            maxDate={range?.end ?? undefined}
            disabled={saving}
            hint="One date counts as one class."
          />
        </View>
        {badDate ? (
          <Notice
            tone="warn"
            message={`That date was not valid or is in the future, so ${date === today ? 'today' : formatDate(date)} is shown.`}
          />
        ) : null}
        {ready ? (
          liveSessionId ? (
            <Notice
              tone="warn"
              title="A live session is running on this date"
              message="Mark students present in the session instead. Their statuses show here after the session is saved, and you can correct them then."
            >
              {/* The course page's Attendance tab has the session's lists and Mark present. */}
              <Link href={courseHref(courseInfoId)} dismissTo asChild>
                <Button label="Go to the live session" icon={Radio} compact />
              </Link>
            </Notice>
          ) : !rows.length ? null : hasClass ? (
            <Notice
              tone="info"
              title={`${formatDateWithWeekday(date)} already has a class`}
              message={`The switches show what was saved. Saving changes only the students you switch; how they checked in is kept.${
                unmarkedSaved ? ' Students with no mark yet stay unmarked unless you pick Present or Absent for them.' : ''
              }`}
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
        {saved && saved.date === date ? (
          <Notice tone="success" message={saved.text}>
            <Link href={courseHref(courseInfoId, 'history', { date: saved.date })} dismissTo asChild>
              <Button label="See it in History" compact />
            </Link>
          </Notice>
        ) : null}
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading the class list…" />
        </Card>
      ) : dateError ? (
        <Card>
          <EmptyState
            icon={CalendarX2}
            title={dateError.code === TEACHER_ERRORS.outsideSemester ? 'Outside the semester' : 'Pick another date'}
            message={dateError.message}
          />
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
      ) : liveSessionId ? null : rows.length === 0 ? (
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
          titleNote={`${presentCount} present · ${absentCount} absent${unmarkedCount ? ` · ${unmarkedCount} no mark yet` : ''}`}
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
              const note = membershipNote(row, newestClass, semesterActive);
              const mark = marks[row.profile_id];
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
                      {[String(row.student_id), note, mark === null ? 'No mark yet' : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <AttendanceToggle
                    name={row.name}
                    value={mark ?? null}
                    disabled={saving}
                    onChange={(status) => setMarks((current) => ({ ...current, [row.profile_id]: status }))}
                  />
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {ready && !liveSessionId && rows.length ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <Text tone="muted">
            {hasClass ? `${changes} ${changes === 1 ? 'change' : 'changes'} to save` : `${presentCount} present, ${absentCount} absent`}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <Button label="Back to the course" onPress={backToCourse} />
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
