import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, PencilLine } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pill, StatusPill } from '@/components/ui/pill';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { catchUpText, firstParam, outsideReason } from '@/components/student/logic';
import { useLoad } from '@/components/student/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { configApi } from '@/lib/api/config';
import { studentApi, type StudentCourseDay } from '@/lib/api/student';
import { formatDateWithWeekday, formatPercent, plural } from '@/lib/format';
import { methodLabel } from '@/lib/methods';
import { cn } from '@/lib/utils';

type DayRow = StudentCourseDay & { how: string };

/** How a day was marked, or why it does not count. */
function howText(day: StudentCourseDay, days: StudentCourseDay[], index: number): string {
  if (!day.status) return outsideReason(days, index);
  const method = methodLabel(day.method);
  if (method) return method;
  return day.status === 'ABSENT' ? 'Not checked in' : '';
}

const ChangedPill = () => <Pill label="Changed by teacher" tone="info" icon={PencilLine} />;

type NumberItem = { label: string; value: string; hint: string; tone?: 'default' | 'warn' };

/** Phones: the three numbers side by side in one card (tiles would wrap). */
function PhoneNumbers({ numbers }: { numbers: NumberItem[] }) {
  return (
    <Card padded={false} className="flex-row">
      {numbers.map((number, index) => (
        <View
          key={number.label}
          accessible
          accessibilityLabel={`${number.label}: ${number.value}, ${number.hint}`}
          className={cn('flex-1 gap-0.5 px-3 py-3', index > 0 && 'border-l border-border')}
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
  const { isDesktop } = useBreakpoint();

  const { data, error, loading, retrying, reload } = useLoad(async () => {
    const [detail, config] = await Promise.all([studentApi.course(courseInfoId), configApi.appCached()]);
    return { detail, min: config.attendance_min_percent };
  }, [courseInfoId]);

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
      <Page>
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
  const rows: DayRow[] = detail.days.map((day, index) => ({ ...day, how: howText(day, detail.days, index) }));
  const meta = `${course.code} · ${course.teacher_name || 'No teacher yet'}\n${course.semester.label}`;
  const numbers: NumberItem[] = [
    {
      label: 'Attendance',
      value: noClasses ? '—' : formatPercent(detail.percent),
      hint: noClasses ? 'No classes yet' : low ? `Below ${min}%` : `Minimum ${min}%`,
      tone: low ? 'warn' : 'default',
    },
    { label: 'Attended', value: String(detail.attended), hint: `of ${plural(detail.held, 'class', 'classes')}` },
    {
      // "Needed" on phones: three numbers share one row there.
      label: isDesktop ? 'Classes needed' : 'Needed',
      value: needed === null ? '—' : needed === 0 ? 'None' : String(needed),
      hint:
        needed === null
          ? `${min}% can't be reached`
          : needed === 0
            ? `At or above ${min}%`
            : `${needed === 1 ? 'class' : 'classes'} to reach ${min}%`,
      tone: low ? 'warn' : 'default',
    },
  ];
  const anyChanged = rows.some((row) => row.changed);

  const columns: Column<DayRow>[] = [
    { key: 'date', title: 'Date', flex: 1.4, render: (row) => <Text weight="medium">{formatDateWithWeekday(row.date)}</Text> },
    { key: 'status', title: 'Status', flex: 1, render: (row) => <StatusPill status={row.status} emptyLabel="Not counted" /> },
    {
      key: 'how',
      title: 'How',
      flex: 1.4,
      render: (row) => (
        <Text tone={row.status ? 'default' : 'muted'}>{row.how || '—'}</Text>
      ),
    },
  ];
  if (anyChanged) columns.push({ key: 'note', title: 'Note', flex: 1.2, render: (row) => (row.changed ? <ChangedPill /> : null) });

  return (
    <Page>
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

      {low ? <Notice tone="warn" title={`Below ${min}%`} message={catchUpText(needed, min)} /> : null}

      <Card title="Class days" titleNote={rows.length ? `(${rows.length})` : undefined} padded={false}>
        <View className="mt-3">
          {!rows.length ? (
            <EmptyState
              icon={CalendarDays}
              title="No classes yet"
              message="When your teacher takes attendance, each class shows here with Present or Absent."
            />
          ) : isDesktop ? (
            <DataTable label="Class days" columns={columns} rows={rows} rowKey={(row) => row.date} />
          ) : (
            rows.map((row, index) => (
              <ListRow
                key={row.date}
                title={formatDateWithWeekday(row.date)}
                subtitle={row.how || undefined}
                right={<StatusPill status={row.status} emptyLabel="Not counted" />}
                divider={index > 0}
              >
                {row.changed ? <ChangedPill /> : null}
              </ListRow>
            ))
          )}
        </View>
      </Card>
    </Page>
  );
}
