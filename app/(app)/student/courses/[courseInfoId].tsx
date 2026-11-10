import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, PencilLine } from 'lucide-react-native';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { Pill, StatusPill } from '@/components/ui/pill';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import {
  absentReasonText,
  catchUpState,
  catchUpText,
  firstParam,
  noClassesText,
  outsideReason,
} from '@/components/student/logic';
import { useLiveSessions, useRefreshAfterLive } from '@/components/student/use-live-sessions';
import { useLoad } from '@/components/student/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { configApi } from '@/lib/api/config';
import { studentApi, type StudentCourseDay, type StudentCourseDetail } from '@/lib/api/student';
import { formatDate, formatDateWithWeekday, formatPercent, plural } from '@/lib/format';
import { methodLabel } from '@/lib/methods';
import { cn } from '@/lib/utils';

type DayRow = StudentCourseDay & { how: string };

/**
 * From this window width the class days are a table (Date, Status, How, Note). Below it the
 * columns are too narrow for the pills (the 248 px sidebar starts at 768 px): the phone list.
 */
const TABLE_MIN = 1024;

/**
 * Below this width (in text units: large text needs more room) the phone numbers card puts two
 * numbers in its first row and the third under them: three side by side would break
 * "Attendance" and "100%" in the middle.
 */
const THREE_NUMBERS_MIN = 360;

/** How a day was marked, or why it does not count or is absent. */
function howText(day: StudentCourseDay, detail: StudentCourseDetail, index: number): string {
  if (!day.status) return outsideReason(detail.days, index, detail);
  if (day.status === 'ABSENT') {
    // Older servers send no absent_reason: tell what the day itself says.
    const guess = day.changed ? 'changed' : day.method === 'TEACHER' ? 'roll_call' : 'not_checked_in';
    return absentReasonText(day.absent_reason) || absentReasonText(guess);
  }
  return methodLabel(day.method);
}

const ChangedPill = () => <Pill label="Changed by teacher" tone="info" icon={PencilLine} />;

type NumberItem = { label: string; value: string; hint: string; tone?: 'default' | 'warn' };

/** Phones: the three numbers in one card (tiles would wrap); on a narrow screen 2 + 1. */
function PhoneNumbers({ numbers }: { numbers: NumberItem[] }) {
  const { width, fontScale } = useWindowDimensions();
  const narrow = width / (fontScale || 1) < THREE_NUMBERS_MIN;
  return (
    <Card padded={false} className="flex-row flex-wrap">
      {numbers.map((number, index) => (
        <View
          key={number.label}
          accessible
          accessibilityLabel={`${number.label}: ${number.value}, ${number.hint}`}
          className={cn(
            'gap-0.5 px-3 py-3',
            !narrow ? 'flex-1' : index < 2 ? 'w-1/2' : 'w-full border-t border-border',
            index > 0 && !(narrow && index === 2) && 'border-l border-border'
          )}
        >
          <Text variant="small" tone={number.tone === 'warn' ? 'warnInk' : 'muted'}>
            {number.label}
          </Text>
          <Text variant="stat" tabular tone={number.tone === 'warn' ? 'warn' : 'default'}>
            {number.value}
          </Text>
          <Text variant="caption" tone={number.tone === 'warn' ? 'warnInk' : 'muted'}>
            {number.hint}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** /student/courses/[courseInfoId]: one course with each class day, newest first. */
export default function StudentCourse() {
  const params = useLocalSearchParams<{ courseInfoId: string }>();
  const courseInfoId = firstParam(params.courseInfoId) ?? '';
  const { isDesktop, width } = useBreakpoint();
  const live = useLiveSessions();

  const { data, error, loading, retrying, reload, refresh, pull } = useLoad(async () => {
    const [detail, config] = await Promise.all([studentApi.course(courseInfoId), configApi.appCached()]);
    return { detail, min: config.attendance_min_percent };
  }, [courseInfoId]);
  // A live class of this course ended (saved now): show its day.
  useRefreshAfterLive(live.sessions, refresh, courseInfoId);

  const course = data?.detail.course;
  const breadcrumb = [{ label: 'Courses', href: '/student/courses' as const }, { label: course?.code ?? 'Course' }];

  if (loading) {
    return (
      <Page>
        <PageHeader title="Course" breadcrumb={breadcrumb} />
        <LoadingState label="Loading the course…" />
      </Page>
    );
  }

  if (error || !data || !course) {
    const notMine = error?.code === 'not_enrolled' || error?.status === 403;
    const missing = error?.status === 404;
    return (
      <Page onRefresh={pull}>
        <PageHeader title="Course" breadcrumb={breadcrumb} />
        <Card>
          <ErrorState
            title={notMine ? "You're not in this course" : missing ? 'Course not found' : "Couldn't load this course"}
            message={
              notMine
                ? 'This course is not in your class group, so it has no attendance for you.'
                : missing
                  ? 'It may have been removed. Your other courses are on the Courses page.'
                  : error?.message ?? 'Please try again.'
            }
            onRetry={notMine || missing ? undefined : reload}
            retrying={retrying}
          />
          {notMine || missing ? (
            <View className="items-center pb-4">
              <Link href="/student/courses" asChild>
                <Button label="Back to courses" icon={ArrowLeft} className="self-center" />
              </Link>
            </View>
          ) : null}
        </Card>
      </Page>
    );
  }

  const { detail, min } = data;
  const noClasses = detail.held === 0 || detail.percent === null;
  const low = !noClasses && (detail.percent ?? 0) < min;
  const needed = detail.classes_needed;
  // More classes can count only in a semester that is running and that the student is still in.
  const state = catchUpState(course.semester.is_active, detail.left_at);
  const closedHint = state === 'finished' ? 'Semester finished' : 'You left this semester';
  // "No classes yet" while classes can still come; "No classes held" once the semester is over.
  const noClassesHint = noClassesText(state);
  const rows: DayRow[] = detail.days.map((day, index) => ({ ...day, how: howText(day, detail, index) }));
  const meta = `${course.code} · ${course.teacher_name || 'No teacher yet'}\n${course.semester.label}`;
  const numbers: NumberItem[] = [
    {
      label: 'Attendance',
      value: noClasses ? '—' : formatPercent(detail.percent),
      hint: noClasses ? noClassesHint : low ? `Below ${min}%` : `Minimum ${min}%`,
      tone: low ? 'warn' : 'default',
    },
    { label: 'Attended', value: String(detail.attended), hint: `of ${plural(detail.held, 'class', 'classes')}` },
    {
      // "Needed" on phones: three numbers share one row there.
      label: isDesktop ? 'Classes needed' : 'Needed',
      value: noClasses || (low && state !== 'open') ? '—' : needed === null ? '—' : needed === 0 ? 'None' : String(needed),
      hint: noClasses
        ? noClassesHint
        : low && state !== 'open'
          ? closedHint
          : needed === null
            ? `${min}% can't be reached`
            : needed === 0
              ? `At or above ${min}%`
              : `${needed === 1 ? 'class' : 'classes'} to reach ${min}%`,
      tone: low && state === 'open' ? 'warn' : 'default',
    },
  ];
  const anyChanged = rows.some((row) => row.changed);

  const { page, setPage, pageSize, setPageSize, totalPages, pagedItems } = usePagination(rows, { pageSize: 15 });

  // Status and Note hold one pill each: fixed widths keep "Not counted" and "Changed by teacher"
  // on one line.
  const columns: Column<DayRow>[] = [
    { key: 'date', title: 'Date', flex: 1.4, render: (row) => <Text weight="medium">{formatDateWithWeekday(row.date)}</Text> },
    { key: 'status', title: 'Status', width: 128, render: (row) => <StatusPill status={row.status} emptyLabel="Not counted" /> },
    {
      key: 'how',
      title: 'How',
      flex: 1.4,
      render: (row) => (
        <Text tone={row.status ? 'default' : 'muted'}>{row.how || '—'}</Text>
      ),
    },
  ];
  if (anyChanged) columns.push({ key: 'note', title: 'Note', width: 172, render: (row) => (row.changed ? <ChangedPill /> : null) });

  return (
    <Page onRefresh={pull}>
      <PageHeader
        title={course.title}
        breadcrumb={breadcrumb}
        meta={meta}
        actions={course.semester.is_active ? null : <Pill label="Finished semester" tone="neutral" />}
      />

      {isDesktop ? (
        <View className="flex-row flex-wrap gap-3">
          {numbers.map((number) => (
            <StatTile key={number.label} {...number} />
          ))}
        </View>
      ) : (
        <PhoneNumbers numbers={numbers} />
      )}

      {low ? (
        <Notice
          tone="warn"
          title={`Below ${min}%`}
          message={
            state === 'open'
              ? catchUpText(needed, min)
              : state === 'finished'
                ? 'This semester is finished, so no more classes count in this course.'
                : 'You left this semester, so no more classes count for you here.'
          }
        />
      ) : null}
      {state === 'open' && detail.joined_at && detail.held === 0 && rows.length ? (
        <Notice message={`You joined on ${formatDate(detail.joined_at)}. Classes from then on count for you.`} />
      ) : null}

      <Card title="Class days" titleNote={rows.length ? `(${rows.length})` : undefined} padded={false}>
        <View className="mt-3">
          {!rows.length ? (
            state === 'open' ? (
              <EmptyState
                icon={CalendarDays}
                title="No classes yet"
                message="When your teacher takes attendance, each class shows here with Present or Absent."
              />
            ) : (
              <EmptyState icon={CalendarDays} title="No classes held" message="No attendance was recorded in this course." />
            )
          ) : width >= TABLE_MIN ? (
            <DataTable label="Class days" columns={columns} rows={pagedItems} rowKey={(row) => row.date} />
          ) : (
            pagedItems.map((row, index) => (
              <ListRow
                key={row.date}
                title={formatDateWithWeekday(row.date)}
                subtitle={row.how || undefined}
                right={<StatusPill status={row.status} emptyLabel="Not counted" />}
                divider={index > 0}
                className={isDesktop ? 'px-5' : undefined}
              >
                {row.changed ? <ChangedPill /> : null}
              </ListRow>
            ))
          )}
        </View>
        {rows.length > 0 ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={rows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[15, 30, 50]}
            itemLabel="days"
          />
        ) : null}
      </Card>
    </Page>
  );
}
