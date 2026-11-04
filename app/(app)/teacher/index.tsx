import { BookOpen } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { CourseCard } from '@/components/teacher/course-card';
import { useLoad, useMinPercent } from '@/components/teacher/use-load';
import { useAuth } from '@/hooks/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { teacherApi, type TeacherCourse } from '@/lib/api/teacher';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';

function CourseGrid({ courses, minPercent }: { courses: TeacherCourse[]; minPercent: number }) {
  const { width, isDesktop } = useBreakpoint();
  // Two cards side by side when the content column is wide enough (sidebar is 248 px).
  const columns = isDesktop && width - 248 >= 860 ? 2 : 1;
  const rows: TeacherCourse[][] = [];
  for (let i = 0; i < courses.length; i += columns) rows.push(courses.slice(i, i + columns));
  return (
    <View className={isDesktop ? 'gap-5' : 'gap-4'}>
      {rows.map((row) => (
        <View key={row[0].course_info_id} className={cn('flex-row', isDesktop ? 'gap-5' : 'gap-4')}>
          {row.map((course) => (
            <View key={course.course_info_id} className="flex-1">
              <CourseCard course={course} minPercent={minPercent} />
            </View>
          ))}
          {row.length < columns ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

/** /teacher: the teacher's courses this semester and in earlier (finished) semesters. */
export default function TeacherCourses() {
  const { user } = useAuth();
  const minPercent = useMinPercent();
  const courses = useLoad(() => teacherApi.courses(user!.id), [user?.id], { refreshOnFocus: true });

  const current = courses.data?.current ?? [];
  const previous = courses.data?.previous ?? [];
  const liveCount = current.filter((course) => course.live_session_id).length;

  let meta = 'Your courses this semester and before';
  if (courses.data) {
    meta = current.length
      ? `${plural(current.length, 'course')} this semester`
      : previous.length
        ? 'No courses this semester'
        : 'No courses assigned yet';
    if (liveCount) meta += ` · ${liveCount} taking attendance now`;
  }

  return (
    <Page>
      <PageHeader title="My courses" meta={meta} />

      {courses.loading ? (
        <Card>
          <LoadingState label="Loading your courses…" />
        </Card>
      ) : courses.error ? (
        <Card>
          <ErrorState message={courses.error.message} onRetry={() => courses.reload()} />
        </Card>
      ) : !current.length && !previous.length ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            message="An admin assigns courses to teachers. When a course is assigned to you, it shows here."
          />
        </Card>
      ) : (
        <>
          <View className="gap-3">
            <Text variant="section">This semester</Text>
            {current.length ? (
              <CourseGrid courses={current} minPercent={minPercent} />
            ) : (
              <Card>
                <EmptyState
                  icon={BookOpen}
                  title="No courses this semester"
                  message="An admin assigns courses to teachers. Your earlier courses are below."
                />
              </Card>
            )}
          </View>

          {previous.length ? (
            <View className="gap-3">
              <View className="gap-0.5">
                <Text variant="section">Previous semesters</Text>
                <Text tone="muted">Finished semesters. You can still view, correct and export them.</Text>
              </View>
              <CourseGrid courses={previous} minPercent={minPercent} />
            </View>
          ) : null}
        </>
      )}
    </Page>
  );
}
