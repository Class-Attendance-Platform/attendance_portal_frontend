import { GraduationCap } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pill } from '@/components/ui/pill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { CourseRow } from '@/components/student/CourseRow';
import { currentSemester, orderSemesters } from '@/components/student/logic';
import { useLoad } from '@/components/student/use-load';
import { useAuth } from '@/hooks/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { configApi } from '@/lib/api/config';
import { studentApi, type StudentSemester } from '@/lib/api/student';
import { formatDate, formatPercent } from '@/lib/format';

function SemesterCard({ semester, current, min }: { semester: StudentSemester; current: boolean; min: number }) {
  const { isDesktop } = useBreakpoint();
  const overall = semester.overall_percent;
  const low = overall !== null && overall < min;
  // Finished: the semester is over. Left: the student moved out of it (promoted or removed).
  const status = current ? (
    <Pill label="Current" tone="primary" dot />
  ) : !semester.is_active ? (
    <Pill label="Finished" tone="neutral" />
  ) : (
    <Pill label={semester.left_at ? `Left on ${formatDate(semester.left_at)}` : 'Not current'} tone="neutral" />
  );
  return (
    <Card padded={false}>
      <View className={isDesktop ? 'gap-1 px-5 pt-5' : 'gap-1 px-4 pt-4'}>
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
          <Text variant="section">{semester.label}</Text>
          {status}
        </View>
        <Text variant="small" tone={low ? 'warn' : 'muted'} weight={low ? 'semibold' : 'regular'}>
          {overall === null ? 'Overall: no classes yet' : `Overall ${formatPercent(overall)}${low ? ` · below ${min}%` : ''}`}
        </Text>
      </View>
      <View className="mt-2 pb-1">
        {semester.courses.length ? (
          semester.courses.map((course, index) => (
            <CourseRow
              key={course.course_info_id}
              courseInfoId={course.course_info_id}
              code={course.course.code}
              title={course.course.title}
              teacher={course.teacher?.userName}
              attended={course.attended}
              held={course.held}
              percent={course.percent}
              classesNeeded={course.classes_needed}
              belowMin={course.below_min}
              min={min}
              divider={index > 0}
            />
          ))
        ) : (
          <Text tone="muted" className={isDesktop ? 'px-5 pb-4' : 'px-4 pb-3'}>
            No courses in this semester.
          </Text>
        )}
      </View>
    </Card>
  );
}

/** /student/courses: every semester (the current one first), each with its courses. */
export default function StudentCourses() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data, error, loading, retrying, reload } = useLoad(async () => {
    const [semesters, config] = await Promise.all([studentApi.semesters(userId), configApi.appCached()]);
    return { semesters: semesters.semesters ?? [], min: config.attendance_min_percent };
  }, [userId]);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingState label="Loading your courses…" />;
  } else if (error || !data) {
    body = (
      <Card>
        <ErrorState
          title="Couldn't load your courses"
          message={error?.message ?? 'Please try again.'}
          onRetry={reload}
          retrying={retrying}
        />
      </Card>
    );
  } else if (!data.semesters.length) {
    body = (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="You're not in a semester yet"
          message="Ask the department office to add you to your semester. Your courses show here after that."
        />
      </Card>
    );
  } else {
    const current = currentSemester(data.semesters);
    body = (
      <>
        {current ? null : (
          <Notice message="You're not in a semester right now. Ask the department office to add you to your semester." />
        )}
        {orderSemesters(data.semesters).map((semester) => (
          <SemesterCard key={semester.id} semester={semester} current={semester === current} min={data.min} />
        ))}
      </>
    );
  }

  return (
    <Page>
      <PageHeader title="Courses" meta="Your attendance in every semester" />
      {body}
    </Page>
  );
}
