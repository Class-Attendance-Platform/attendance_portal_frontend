import { useRouter, type Href } from 'expo-router';
import { CalendarPlus, CalendarRange, ClipboardList } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useAppConfig, useLoad } from '@/components/admin/hooks';
import { LinkTile, LoadBlock, ResponsiveList, TwoLines } from '@/components/admin/parts';
import { Page } from '@/components/layout/Page';
import { Card, EmptyState, PageHeader, Pill, ProgressBar, Text, type Column } from '@/components/ui';
import { adminApi, type Overview } from '@/lib/api';
import { todayISO } from '@/lib/dates';
import { formatDate, formatDateWithWeekday, formatPercent, plural } from '@/lib/format';

type SemesterRow = Overview['semesters'][number];
type SessionRow = Overview['recent_sessions'][number];

const deliveryLabel = (row: SessionRow) =>
  `${row.delivery === 'ONLINE' ? 'Online' : 'In class'}${row.mode === 'FACE' ? ' · face photo' : ''}`;

/** /admin: counts, active semesters, recent sessions. */
export default function AdminOverview() {
  const router = useRouter();
  const config = useAppConfig();
  const min = config.attendance_min_percent;
  const overview = useLoad(() => adminApi.overview(), []);

  const semesterColumns: Column<SemesterRow>[] = [
    { key: 'label', title: 'Semester', flex: 2.2, render: (row) => <Text weight="semibold">{row.label}</Text> },
    { key: 'students', title: 'Students', width: 90, align: 'right', render: (row) => String(row.student_count) },
    { key: 'courses', title: 'Courses', width: 84, align: 'right', render: (row) => String(row.course_count) },
    {
      key: 'average',
      title: 'Average',
      flex: 1.4,
      render: (row) => (
        <View className="w-full flex-row items-center gap-3">
          <Text tabular weight="semibold" className="w-12">
            {formatPercent(row.average_percent)}
          </Text>
          <View className="flex-1">
            <ProgressBar value={row.average_percent} min={min} label={`${row.label} average attendance`} thin />
          </View>
        </View>
      ),
    },
    {
      key: 'below',
      title: `Below ${min}%`,
      width: 110,
      align: 'right',
      render: (row) =>
        row.below_min_count > 0 ? (
          <Pill label={plural(row.below_min_count, 'student')} tone="warn" />
        ) : (
          <Text tone="muted">None</Text>
        ),
    },
  ];

  const sessionColumns: Column<SessionRow>[] = [
    { key: 'course', title: 'Course', flex: 2.4, render: (row) => <TwoLines main={row.course_code} sub={row.course_title} /> },
    { key: 'date', title: 'Date', width: 120, render: (row) => formatDate(row.date) },
    { key: 'delivery', title: 'Where', flex: 1.2, render: deliveryLabel },
    {
      key: 'present',
      title: 'Present',
      width: 96,
      align: 'right',
      render: (row) => (
        <Text tabular>
          {row.present} / {row.total}
        </Text>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader title="Overview" meta={`Department of CSE · ${formatDateWithWeekday(todayISO())}`} />
      <LoadBlock state={overview} loadingLabel="Loading the overview…">
        {(data) => (
          <>
            <View className="flex-row flex-wrap gap-4">
              <LinkTile href="/admin/students" label="Students" value={String(data.counts.students)} hint="Approved accounts" />
              <LinkTile href="/admin/teachers" label="Teachers" value={String(data.counts.teachers)} hint="Approved accounts" />
              <LinkTile href="/admin/courses" label="Courses" value={String(data.counts.courses)} hint="In the catalogue" />
              <LinkTile href="/admin/semesters" label="Active semesters" value={String(data.counts.active_semesters)} hint="Running now" />
              <LinkTile
                href="/admin/approvals"
                label="Waiting for approval"
                value={String(data.counts.pending_approvals)}
                hint={data.counts.pending_approvals ? 'Review the sign-ups' : 'Nothing to review'}
                warn={data.counts.pending_approvals > 0}
              />
            </View>

            <Card title="Active semesters" titleNote={`(${data.semesters.length})`} padded={false}>
              <View className="mt-3">
                {data.semesters.length === 0 ? (
                  <EmptyState
                    icon={CalendarPlus}
                    title="No active semester"
                    message="Create a semester for each level that has classes, then add its students and courses."
                    action={{ label: 'Go to semesters', icon: CalendarRange, onPress: () => router.push('/admin/semesters') }}
                  />
                ) : (
                  <ResponsiveList
                    label="Active semesters"
                    rows={data.semesters}
                    rowKey={(row) => row.id}
                    columns={semesterColumns}
                    onRowPress={(row) => router.push(`/admin/semesters/${row.id}` as Href)}
                    rowLabel={(row) => `Open ${row.label}`}
                    phoneRow={(row) => ({
                      title: row.label,
                      subtitle: `${plural(row.student_count, 'student')} · ${plural(row.course_count, 'course')}`,
                      children: (
                        <>
                          <View className="flex-row items-center gap-3">
                            <Text variant="small" weight="semibold" tabular>
                              Average {formatPercent(row.average_percent)}
                            </Text>
                            <View className="flex-1">
                              <ProgressBar value={row.average_percent} min={min} label={`${row.label} average attendance`} thin />
                            </View>
                          </View>
                          {row.below_min_count > 0 ? (
                            <Pill label={`${plural(row.below_min_count, 'student')} below ${min}%`} tone="warn" />
                          ) : null}
                        </>
                      ),
                    })}
                  />
                )}
              </View>
            </Card>

            <Card title="Recent sessions" titleNote="(last 10 saved)" padded={false}>
              <View className="mt-3">
                {data.recent_sessions.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No sessions saved yet"
                    message="Live code and face photo sessions show here once teachers save them."
                  />
                ) : (
                  <ResponsiveList
                    label="Recent sessions"
                    rows={data.recent_sessions}
                    rowKey={(row) => row.session_id}
                    columns={sessionColumns}
                    onRowPress={(row) => router.push(`/admin/attendance/${row.course_info_id}` as Href)}
                    rowLabel={(row) => `${row.course_code} on ${formatDate(row.date)}: ${row.present} of ${row.total} present. Open the course.`}
                    phoneRow={(row) => ({
                      title: `${row.course_code} · ${row.course_title}`,
                      subtitle: `${formatDate(row.date)} · ${deliveryLabel(row)}`,
                      right: (
                        <Text tabular weight="semibold">
                          {row.present} / {row.total}
                        </Text>
                      ),
                    })}
                  />
                )}
              </View>
            </Card>
          </>
        )}
      </LoadBlock>
    </Page>
  );
}
