import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, Download, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useAppConfig, useLoad } from '@/components/admin/hooks';
import { LoadBlock, ResponsiveList, TwoLines } from '@/components/admin/parts';
import { ExportDialog } from '@/components/teacher/export-form';
import { Page } from '@/components/layout/Page';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  Pill,
  ProgressBar,
  StatTile,
  StatusPill,
  Tabs,
  Text,
  useTab,
  type Column,
  type TabItem,
} from '@/components/ui';
import {
  adminApi,
  teacherApi,
  type ClassDate,
  type CourseStudent,
  type CourseStudentDetail,
  type TeacherCourseDetail,
  type UUID,
} from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDate, formatDateTime, formatDateWithWeekday, formatPercent, plural } from '@/lib/format';
import { methodLabel } from '@/lib/methods';

const TABS: TabItem[] = [
  { key: 'students', label: 'Students' },
  { key: 'dates', label: 'Class dates' },
];

const percentOf = (present: number, total: number) => (total ? (present / total) * 100 : null);

function membershipLine(student: { joined_at: string | null; left_at: string | null }): string | null {
  const parts = [];
  if (student.joined_at) parts.push(`Joined ${formatDate(student.joined_at)}`);
  if (student.left_at) parts.push(`Left ${formatDate(student.left_at)}`);
  return parts.length ? parts.join(' · ') : null;
}

/** One student's days in the course (read-only). */
function StudentDaysDialog({ courseInfoId, student, onClose }: { courseInfoId: UUID; student: CourseStudent | null; onClose: () => void }) {
  const [detail, setDetail] = React.useState<CourseStudentDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!student) return;
    setDetail(null);
    setError(null);
    teacherApi
      .student(courseInfoId, student.profile_id)
      .then(setDetail)
      .catch((caught) => setError(toApiError(caught).message));
  }, [courseInfoId, student]);

  React.useEffect(load, [load]);

  return (
    <Dialog
      open={!!student}
      onClose={onClose}
      title={student?.name ?? ''}
      description={
        student
          ? `${student.student_id} · attended ${student.attended} of ${plural(student.held, 'class', 'classes')} (${formatPercent(student.percent)})`
          : undefined
      }
      actions={<Button label="Close" onPress={onClose} />}
    >
      {error ? (
        <View className="gap-3">
          <Notice tone="error" message={error} />
          <Button label="Try again" onPress={load} />
        </View>
      ) : !detail ? (
        <LoadingState />
      ) : detail.days.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No classes yet" message="Days show here once the course holds classes." />
      ) : (
        <View role="list" accessibilityLabel="Days" className="-mx-1">
          {detail.days.map((day, index) => {
            const method = day.status === 'PRESENT' ? methodLabel(day.method) || null : null;
            const changed = day.changed_by ? `Changed by ${day.changed_by}${day.changed_at ? `, ${formatDateTime(day.changed_at)}` : ''}` : null;
            return (
              <View
                key={day.date}
                role="listitem"
                className={`flex-row flex-wrap items-center justify-between gap-2 px-1 py-2.5 ${index > 0 ? 'border-t border-border' : ''}`}
              >
                <View className="flex-1 gap-0.5" style={{ minWidth: 160 }}>
                  <Text weight="medium">{formatDateWithWeekday(day.date)}</Text>
                  {method || changed ? (
                    <Text variant="small" tone="muted">
                      {[method, changed].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <StatusPill status={day.status} />
              </View>
            );
          })}
        </View>
      )}
    </Dialog>
  );
}

/** /admin/attendance/[courseInfoId]: read-only numbers, students, class dates, exports. */
export default function AdminCourseAttendance() {
  const params = useLocalSearchParams<{ courseInfoId: string }>();
  const courseInfoId = Array.isArray(params.courseInfoId) ? params.courseInfoId[0] : params.courseInfoId;
  const config = useAppConfig();
  const min = config.attendance_min_percent;
  const tab = useTab(TABS);
  const [exporting, setExporting] = React.useState(false);
  const [student, setStudent] = React.useState<CourseStudent | null>(null);

  const detail = useLoad(async (): Promise<TeacherCourseDetail & { teacherName: string | null }> => {
    const course = await teacherApi.course(courseInfoId);
    // The teacher's name is only in the admin list (this semester's courses only); the page works without it.
    const infos = await adminApi.courseInfos({ semesterId: course.course.semester.id }).catch(() => null);
    const info = infos?.course_infos.find((row) => row.id === courseInfoId);
    const teacher = info?.teacher;
    const teacherName = !info ? null : !teacher ? 'No teacher yet' : teacher.deleted ? `${teacher.name} (deleted)` : teacher.name;
    return { ...course, teacherName };
  }, [courseInfoId]);

  const data = detail.data;
  const course = data?.course;

  const studentColumns: Column<CourseStudent>[] = [
    { key: 'student_id', title: 'Student ID', width: 104, render: (row) => <Text tabular>{String(row.student_id)}</Text> },
    { key: 'name', title: 'Name', flex: 2.2, render: (row) => <TwoLines main={row.name} sub={membershipLine(row)} /> },
    {
      key: 'attended',
      title: 'Present',
      width: 96,
      align: 'right',
      render: (row) => (
        <Text tabular>
          {row.attended} / {row.held}
        </Text>
      ),
    },
    {
      key: 'percent',
      title: 'Attendance',
      flex: 1.8,
      render: (row) => (
        <View className="w-full flex-row items-center gap-3">
          <Text tabular weight="semibold" tone={row.below_min ? 'warn' : 'default'} className="w-12">
            {formatPercent(row.percent)}
          </Text>
          <View className="flex-1">
            <ProgressBar value={row.percent} min={min} label={`${row.name} attendance`} thin />
          </View>
        </View>
      ),
    },
    {
      key: 'flag',
      title: '',
      width: 116,
      align: 'right',
      render: (row) => (row.below_min ? <Pill label={`Below ${min}%`} tone="warn" /> : null),
    },
  ];

  const dateColumns: Column<ClassDate>[] = [
    { key: 'date', title: 'Date', flex: 1.6, render: (row) => formatDateWithWeekday(row.date) },
    {
      key: 'present',
      title: 'Present',
      width: 110,
      align: 'right',
      render: (row) => (
        <Text tabular>
          {row.present} / {row.total}
        </Text>
      ),
    },
    {
      key: 'bar',
      title: 'Share present',
      flex: 2,
      render: (row) => (
        <View className="w-full flex-row items-center gap-3">
          <Text tabular className="w-12">
            {formatPercent(percentOf(row.present, row.total))}
          </Text>
          <View className="flex-1">
            <ProgressBar value={percentOf(row.present, row.total)} label={`${formatDate(row.date)} present`} thin />
          </View>
        </View>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title={course?.title ?? 'Course attendance'}
        breadcrumb={[{ label: 'Attendance', href: '/admin/attendance' }, { label: course?.code ?? 'Course' }]}
        meta={
          course
            ? [course.code, course.semester.label, data?.teacherName, plural(course.student_count, 'student')].filter(Boolean).join(' · ')
            : undefined
        }
        actions={course ? <Button label="Export" variant="primary" icon={Download} onPress={() => setExporting(true)} /> : undefined}
      />
      <LoadBlock state={detail} loadingLabel="Loading attendance…" errorTitle="Couldn't load this course">
        {(loaded) => {
          const below = loaded.course.below_min_count;
          return (
            <>
              <View className="flex-row flex-wrap gap-2">
                <Pill label="Read-only" tone="info" />
                {loaded.course.semester.is_active ? null : <Pill label="Finished semester" tone="neutral" />}
                {loaded.course.live_session_id ? <Pill label="Live session running" tone="primary" dot /> : null}
              </View>
              <View className="flex-row flex-wrap gap-4">
                <StatTile label="Classes held" value={String(loaded.course.classes_held)} hint="One date counts as one class" />
                <StatTile label="Average attendance" value={formatPercent(loaded.course.average_percent)} />
                <StatTile
                  label={`Below ${min}%`}
                  value={String(below)}
                  tone={below > 0 ? 'warn' : 'default'}
                  hint={below > 0 ? `${below === 1 ? 'Student needs' : 'Students need'} attention` : 'Everyone is above'}
                />
                <StatTile
                  label="Faces registered"
                  value={`${loaded.course.face_registered_count} / ${loaded.course.student_count}`}
                  hint="For face attendance"
                />
              </View>

              <Tabs tabs={TABS} value={tab} label="Course sections" />

              {tab === 'students' ? (
                <Card title="Students" titleNote={`(${loaded.students.length})`} padded={false}>
                  <View className="mt-3">
                    {loaded.students.length === 0 ? (
                      <EmptyState icon={Users} title="No students" message="Students show here once they are in the course's semester." />
                    ) : (
                      <ResponsiveList
                        label="Students"
                        rows={loaded.students}
                        rowKey={(row) => row.profile_id}
                        columns={studentColumns}
                        onRowPress={setStudent}
                        rowLabel={(row) => `${row.name}, ${formatPercent(row.percent)}. Open to see each day.`}
                        phoneRow={(row) => ({
                          title: row.name,
                          subtitle: `${row.student_id} · ${row.attended} of ${plural(row.held, 'class', 'classes')}`,
                          right: (
                            <Text tabular weight="semibold" tone={row.below_min ? 'warn' : 'default'}>
                              {formatPercent(row.percent)}
                            </Text>
                          ),
                          children: (
                            <>
                              <ProgressBar value={row.percent} min={min} label={`${row.name} attendance`} thin />
                              {row.below_min ? <Pill label={`Below ${min}%`} tone="warn" /> : null}
                              {membershipLine(row) ? (
                                <Text variant="small" tone="muted">
                                  {membershipLine(row)}
                                </Text>
                              ) : null}
                            </>
                          ),
                        })}
                      />
                    )}
                  </View>
                </Card>
              ) : (
                <Card title="Class dates" titleNote={`(${loaded.dates.length})`} padded={false}>
                  <View className="mt-3">
                    {loaded.dates.length === 0 ? (
                      <EmptyState icon={CalendarDays} title="No classes yet" message="Dates show here once the teacher saves a session or a roll call." />
                    ) : (
                      <ResponsiveList
                        label="Class dates"
                        rows={loaded.dates}
                        rowKey={(row) => row.date}
                        columns={dateColumns}
                        phoneRow={(row) => ({
                          title: formatDateWithWeekday(row.date),
                          right: (
                            <Text tabular weight="semibold">
                              {row.present} / {row.total}
                            </Text>
                          ),
                          children: <ProgressBar value={percentOf(row.present, row.total)} label={`${formatDate(row.date)} present`} thin />,
                        })}
                      />
                    )}
                  </View>
                </Card>
              )}

              <Text variant="small" tone="muted">
                Read-only. The course's teacher takes attendance and makes corrections.
              </Text>

              <ExportDialog
                open={exporting}
                courseInfoId={courseInfoId}
                courseCode={loaded.course.code}
                dates={loaded.dates}
                onClose={() => setExporting(false)}
              />
              <StudentDaysDialog courseInfoId={courseInfoId} student={student} onClose={() => setStudent(null)} />
            </>
          );
        }}
      </LoadBlock>
    </Page>
  );
}
