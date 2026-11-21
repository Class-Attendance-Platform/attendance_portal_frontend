import { useLocalSearchParams, type Href } from 'expo-router';
import { CalendarX2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { StatusPill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { FlipButton, useCorrection } from '@/components/teacher/correction';
import { courseHref, methodLabel, param } from '@/components/teacher/labels';
import { CourseLoadError } from '@/components/teacher/load-error';
import { shownLeftAt } from '@/components/teacher/rules';
import { membershipNote } from '@/components/teacher/students-tab';
import { useLoad, useMinPercent } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { teacherApi, type SetAttendanceResponse, type StudentDay } from '@/lib/api/teacher';
import { addDays } from '@/lib/dates';
import { formatDate, formatDateTime, formatDateWithWeekday, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

function changedText(day: StudentDay): string {
  if (!day.changed_by && !day.changed_at) return '—';
  return `${day.changed_by ?? 'Someone'}${day.changed_at ? `, ${formatDateTime(day.changed_at)}` : ''}`;
}

function countedText(joinedAt: string | null, leftAt: string | null): string {
  if (joinedAt && leftAt) {
    return `Only classes from ${formatDate(joinedAt)} to ${formatDate(addDays(leftAt, -1))} count for this student.`;
  }
  if (joinedAt) return `Only classes from ${formatDate(joinedAt)} on count for this student.`;
  return `Classes from ${formatDate(leftAt)} on do not count for this student.`;
}

export default function TeacherCourseStudent() {
  const params = useLocalSearchParams<{ courseInfoId: string; profileId: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const profileId = param(params.profileId) ?? '';
  const { width, isDesktop } = useBreakpoint();
  const wide = width >= 1024;
  const minPercent = useMinPercent();

  const detail = useLoad(() => teacherApi.student(courseInfoId, profileId), [courseInfoId, profileId], { refreshOnFocus: true });
  const course = useLoad(() => teacherApi.course(courseInfoId).then((result) => result.course), [courseInfoId]);

  const reloadDetail = detail.reload;
  const onSaved = React.useCallback(
    (result: SetAttendanceResponse) => {
      detail.setData((current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) => (day.date === result.day.date ? { ...day, ...result.day } : day)),
            }
          : current
      );
      void reloadDetail({ quiet: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reloadDetail]
  );
  const correction = useCorrection(courseInfoId, (result) => onSaved(result));

  const courseLabel = course.data?.code ?? 'Course';
  const breadcrumb = [
    { label: 'My courses', href: '/teacher' as Href },
    { label: courseLabel, href: courseHref(courseInfoId, 'students') },
    { label: detail.data?.student.name ?? 'Student' },
  ];

  if (!detail.data) {
    const waiting = !detail.error || detail.loading || (detail.error.status === 404 && course.loading);
    return (
      <Page>
        <PageHeader title="Student" breadcrumb={breadcrumb} />
        {waiting ? (
          <Card>
            <LoadingState label="Loading the student…" />
          </Card>
        ) : (
          <CourseLoadError
            error={detail.error!}
            title="Couldn't open this student"
            onRetry={() => {
              void detail.reload();
              void course.reload();
            }}
            missing={
              course.error?.status === 404
                ? undefined
                : {
                    title: 'Student not found',
                    message: 'This student is not in this course.',
                    backLabel: 'Back to the students',
                    backHref: courseHref(courseInfoId, 'students'),
                  }
            }
          />
        )}
      </Page>
    );
  }

  const { student, days } = detail.data;
  const low = student.percent !== null && student.percent < minPercent;
  const newestClass = days[0]?.date;
  const semesterActive = !!course.data?.semester.is_active;
  const note = membershipNote(student, newestClass, semesterActive);
  const left = shownLeftAt(student.left_at, newestClass, semesterActive);
  const name = student.name;
  const tile = isDesktop ? undefined : 'min-w-[90px] p-3';

  const { page, setPage, pageSize, setPageSize, totalPages, pagedItems } = usePagination(days, { pageSize: 15 });

  const flip = (day: StudentDay) => (next: 'PRESENT' | 'ABSENT') => correction.change(day.date, profileId, next, name);

  const columns: Column<StudentDay>[] = [
    { key: 'date', title: 'Date', flex: 1.4, render: (day) => formatDateWithWeekday(day.date) },
    { key: 'status', title: 'Status', width: 140, render: (day) => <StatusPill status={day.status} emptyLabel="Not enrolled" /> },
    { key: 'method', title: 'How', width: 150, render: (day) => (day.status ? methodLabel(day.method) : '—') },
    {
      key: 'changed',
      title: 'Changed by',
      flex: 1.6,
      render: (day) => (
        <Text variant="small" tone="muted">
          {changedText(day)}
        </Text>
      ),
    },
    {
      key: 'action',
      title: 'Change',
      width: 150,
      render: (day) =>
        day.status ? (
          <FlipButton status={day.status} name={name} date={day.date} busy={correction.isBusy(day.date, profileId)} onFlip={flip(day)} />
        ) : (
          <Text variant="small" tone="muted">
            Not a member then
          </Text>
        ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title={name}
        breadcrumb={breadcrumb}
        meta={[String(student.student_id), student.email, course.data ? `${course.data.code} · ${course.data.title}` : null].filter(Boolean).join(' · ')}
      />

      <Card className="gap-4">
        <View className="flex-row items-center gap-4">
          <Avatar name={name} size={52} />
          <View className="flex-1 gap-1">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text weight="semibold">Attendance in this course</Text>
              <Text weight="bold" tabular tone={low ? 'warn' : 'default'} style={{ fontSize: 22, lineHeight: 28 }}>
                {formatPercent(student.percent)}
              </Text>
            </View>
            <ProgressBar value={student.percent} min={minPercent} label={`${name} attendance`} />
          </View>
        </View>
        <View className={cn('flex-row flex-wrap', isDesktop ? 'gap-4' : 'gap-2')}>
          <StatTile label="Classes held" value={String(student.held)} hint={student.joined_at ? 'since joining' : undefined} className={tile} />
          <StatTile label="Present" value={String(student.attended)} className={tile} />
          <StatTile label="Absent" value={String(Math.max(0, student.held - student.attended))} className={tile} />
        </View>
        {low ? <Notice tone="warn" message={`Below the ${minPercent}% minimum.`} /> : null}
        {note ? <Notice tone="info" message={`${note}. ${countedText(student.joined_at, left)}`} /> : null}
      </Card>

      <Card title="Class days" titleNote={`(${days.length})`} padded={false} className="pb-2">
        <Text variant="small" tone="muted" className={cn('mt-1', isDesktop ? 'px-5' : 'px-4')}>
          Newest first. Switch a day to correct it; the change is saved at once and noted with your name.
        </Text>
        <View className="mt-3">
          {days.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No classes yet" message="Days show here once the course has a class." />
          ) : wide ? (
            <DataTable label={`${name}'s class days`} columns={columns} rows={pagedItems} rowKey={(day) => day.date} />
          ) : (
            pagedItems.map((day, index) => (
              <View key={day.date} className={cn('gap-2 py-3', isDesktop ? 'px-5' : 'px-4', index > 0 && 'border-t border-border')}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text weight="semibold">{formatDateWithWeekday(day.date)}</Text>
                    <Text variant="small" tone="muted">
                      {day.status ? methodLabel(day.method) : 'Not a member on this date'}
                      {day.changed_by || day.changed_at ? ` · Changed by ${changedText(day)}` : ''}
                    </Text>
                  </View>
                  <StatusPill status={day.status} emptyLabel="Not enrolled" />
                </View>
                {day.status ? (
                  <FlipButton status={day.status} name={name} date={day.date} busy={correction.isBusy(day.date, profileId)} onFlip={flip(day)} />
                ) : null}
              </View>
            ))
          )}
        </View>
        {days.length > 0 ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={days.length}
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
