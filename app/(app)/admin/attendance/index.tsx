import { useRouter, type Href } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useAppConfig, useLoad } from '@/components/admin/hooks';
import { FilterBar, FilterItem, LoadBlock, ResponsiveList, TwoLines } from '@/components/admin/parts';
import { Page } from '@/components/layout/Page';
import { Card, EmptyState, PageHeader, Pill, ProgressBar, Select, Text, type Column, type SelectOption } from '@/components/ui';
import { adminApi, type AdminCourseInfo } from '@/lib/api';
import { formatPercent, plural } from '@/lib/format';

/** /admin/attendance: every taught course with its numbers; open one to see it read-only. */
export default function AdminAttendance() {
  const router = useRouter();
  const config = useAppConfig();
  const min = config.attendance_min_percent;
  const [semesterId, setSemesterId] = React.useState('');
  const semesters = useLoad(() => adminApi.semesters('all').then((r) => r.semesters), []);
  const list = useLoad(
    () => adminApi.courseInfos({ semesterId: semesterId || undefined }).then((r) => r.course_infos),
    [semesterId]
  );

  const semesterOptions: SelectOption<string>[] = [
    { label: 'All semesters', value: '' },
    ...(semesters.data ?? []).map((semester) => ({
      label: semester.label,
      value: semester.id,
      description: semester.is_active ? 'Active' : 'Finished',
    })),
  ];

  const average = (row: AdminCourseInfo, wide: boolean) => (
    <View className={wide ? 'w-full flex-row items-center gap-3' : 'flex-row items-center gap-3'}>
      <Text tabular weight="semibold" className="w-12">
        {formatPercent(row.average_percent)}
      </Text>
      <View className="flex-1">
        <ProgressBar value={row.average_percent} min={min} label={`${row.course.code} average attendance`} thin />
      </View>
    </View>
  );

  const columns: Column<AdminCourseInfo>[] = [
    { key: 'course', title: 'Course', flex: 2.2, render: (row) => <TwoLines main={row.course.code} sub={row.course.title} /> },
    {
      key: 'semester',
      title: 'Semester',
      flex: 2,
      render: (row) => (
        <View className="items-start gap-1">
          <Text>{row.semester.label}</Text>
          {row.semester.is_active ? null : <Pill label="Finished" tone="neutral" />}
        </View>
      ),
    },
    {
      key: 'teacher',
      title: 'Teacher',
      flex: 1.5,
      render: (row) =>
        !row.teacher ? (
          <Pill label="No teacher yet" tone="warn" />
        ) : row.teacher.deleted ? (
          <Pill label={`${row.teacher.name}: deleted`} tone="warn" />
        ) : (
          row.teacher.name
        ),
    },
    { key: 'students', title: 'Students', width: 84, align: 'right', render: (row) => String(row.student_count) },
    { key: 'classes', title: 'Classes', width: 80, align: 'right', render: (row) => String(row.classes_held) },
    { key: 'average', title: 'Average', flex: 1.4, render: (row) => average(row, true) },
  ];

  return (
    <Page>
      <PageHeader title="Attendance" meta="Every taught course, read-only. Open one for its students, class dates and exports." />
      <FilterBar>
        <FilterItem wide>
          <Select
            label="Semester"
            hideLabel
            value={semesterId}
            options={semesterOptions}
            onChange={setSemesterId}
            hint={semesters.error ? `Semesters could not be loaded: ${semesters.error.message}` : undefined}
          />
        </FilterItem>
      </FilterBar>
      <Card padded={false} className="overflow-hidden">
        <LoadBlock state={list} loadingLabel="Loading courses…">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={semesterId ? 'No courses in this semester' : 'No courses taught yet'}
                message="Courses show here once they are added to a semester (Semesters → a semester → Courses)."
              />
            ) : (
              <ResponsiveList
                label="Taught courses"
                rows={rows}
                rowKey={(row) => row.id}
                columns={columns}
                onRowPress={(row) => router.push(`/admin/attendance/${row.id}` as Href)}
                rowLabel={(row) => `Open ${row.course.code} ${row.course.title}, ${row.semester.label}`}
                phoneRow={(row) => ({
                  title: `${row.course.code} · ${row.course.title}`,
                  subtitle: `${row.semester.label}${row.semester.is_active ? '' : ' (finished)'}`,
                  children: (
                    <>
                      <Text variant="small" tone="muted">
                        {row.teacher ? `${row.teacher.name}${row.teacher.deleted ? ' (deleted)' : ''}` : 'No teacher yet'} ·{' '}
                        {plural(row.student_count, 'student')} ·{' '}
                        {plural(row.classes_held, 'class', 'classes')}
                      </Text>
                      {average(row, false)}
                    </>
                  ),
                })}
              />
            )
          }
        </LoadBlock>
      </Card>
    </Page>
  );
}
