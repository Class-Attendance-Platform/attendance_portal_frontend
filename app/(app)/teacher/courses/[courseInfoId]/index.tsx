import { Link, useLocalSearchParams } from 'expo-router';
import { ClipboardList, Download } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Tabs, useTab, type TabItem } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { AttendanceTab } from '@/components/teacher/attendance-tab';
import { ExportDialog, ExportForm } from '@/components/teacher/export-form';
import { HistoryTab } from '@/components/teacher/history-tab';
import { courseHref, courseMeta, isFinished, param, rollCallHref } from '@/components/teacher/labels';
import { StudentsTab } from '@/components/teacher/students-tab';
import { useLoad, useMinPercent } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { teacherApi } from '@/lib/api/teacher';

const TABS: TabItem[] = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'students', label: 'Students' },
  { key: 'history', label: 'History' },
  { key: 'reports', label: 'Reports' },
];

/** /teacher/courses/[courseInfoId]?tab=attendance|students|history|reports */
export default function TeacherCourse() {
  const params = useLocalSearchParams<{ courseInfoId: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const tab = useTab(TABS);
  const { isMobile } = useBreakpoint();
  const minPercent = useMinPercent();
  const [exportOpen, setExportOpen] = React.useState(false);
  const detail = useLoad(() => teacherApi.course(courseInfoId), [courseInfoId], { refreshOnFocus: true });
  const { reload } = detail;
  const reloadQuietly = React.useCallback(() => void reload({ quiet: true }), [reload]);

  const course = detail.data?.course;
  const breadcrumb = [{ label: 'My courses', href: '/teacher' as const }, { label: course?.code ?? 'Course' }];

  if (!course) {
    return (
      <Page>
        <PageHeader title={detail.loading ? 'Course' : "Couldn't open this course"} breadcrumb={breadcrumb} />
        <Card>
          {detail.loading ? (
            <LoadingState label="Loading the course…" />
          ) : (
            <ErrorState
              message={detail.error?.message ?? 'Not found. It may have been removed.'}
              onRetry={() => detail.reload()}
            />
          )}
        </Card>
      </Page>
    );
  }

  const data = detail.data!;
  const live = !!course.live_session_id;

  return (
    <Page>
      <PageHeader
        title={course.title}
        breadcrumb={breadcrumb}
        meta={courseMeta(course)}
        actions={
          <>
            <Button label="Export" icon={Download} onPress={() => setExportOpen(true)} />
            <Link href={rollCallHref(courseInfoId)} asChild>
              <Button label="Roll call" icon={ClipboardList} />
            </Link>
          </>
        }
      />

      <Tabs tabs={TABS} value={tab} label="Course sections" dense={isMobile} />

      {isFinished(course) && tab !== 'attendance' ? (
        <Notice tone="info" message="This semester is finished. You can still view, correct and export its attendance." />
      ) : null}
      {live && tab !== 'attendance' ? (
        <Notice tone="success" title="Taking attendance now" message="A live session is running for this course.">
          <Link href={courseHref(courseInfoId)} asChild>
            <Button label="Open the live session" compact />
          </Link>
        </Notice>
      ) : null}

      {tab === 'attendance' ? (
        <AttendanceTab course={course} minPercent={minPercent} onChanged={reloadQuietly} />
      ) : tab === 'students' ? (
        <StudentsTab courseInfoId={courseInfoId} students={data.students} minPercent={minPercent} />
      ) : tab === 'history' ? (
        <HistoryTab courseInfoId={courseInfoId} dates={data.dates} onChanged={reloadQuietly} />
      ) : (
        <Card title="Export attendance" className="gap-4">
          <Text tone="muted">
            Download the attendance of the whole course or of one class date. Files list every student with their
            classes held, presents and percentage (below {minPercent}% is marked).
          </Text>
          <View style={{ maxWidth: 560 }}>
            <ExportForm courseInfoId={courseInfoId} courseCode={course.code} dates={data.dates} />
          </View>
        </Card>
      )}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        courseInfoId={courseInfoId}
        courseCode={course.code}
        dates={data.dates}
      />
    </Page>
  );
}
