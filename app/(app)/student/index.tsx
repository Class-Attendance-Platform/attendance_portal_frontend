import { Link } from 'expo-router';
import { BookOpen, GraduationCap } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { CourseRow } from '@/components/student/CourseRow';
import { FaceReminder } from '@/components/student/FaceReminder';
import { LiveBanner } from '@/components/student/LiveBanner';
import { belowMinSummary, currentSemester } from '@/components/student/logic';
import { useLiveSessions, useRefreshAfterLive } from '@/components/student/use-live-sessions';
import { useLoad } from '@/components/student/use-load';
import { useAuth } from '@/hooks/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { configApi } from '@/lib/api/config';
import { facesApi, onFaceChange } from '@/lib/api/faces';
import { studentApi, type StudentSemester } from '@/lib/api/student';
import { firstName, formatPercent, levelTermLabel, plural } from '@/lib/format';

/**
 * The first time, the page waits at most this long for "Live now" once its own data is in: a
 * banner arriving later would push the page down while the student reads or taps.
 */
const LIVE_WAIT_MS = 2000;

/** Phone: the mockup's "Overall this term" card. */
function OverallCard({ semester, min }: { semester: StudentSemester; min: number }) {
  const percent = semester.overall_percent;
  const low = percent !== null && percent < min;
  return (
    <Card>
      <View
        className="flex-row items-center justify-between gap-4"
        accessible
        accessibilityLabel={`Overall this term: ${percent === null ? 'no classes yet' : formatPercent(percent)}. ${plural(
          semester.courses.length,
          'course'
        )}. Minimum ${min} percent.`}
      >
        <View className="gap-0.5">
          <Text variant="small" tone="muted">
            Overall this term
          </Text>
          <Text variant="stat" tabular tone={low ? 'warn' : 'default'}>
            {percent === null ? '—' : formatPercent(percent)}
          </Text>
          {low ? (
            <Text variant="small" weight="semibold" tone="warn">
              {`Below ${min}%`}
            </Text>
          ) : null}
          {percent === null ? (
            <Text variant="small" tone="muted">
              No classes yet
            </Text>
          ) : null}
        </View>
        <View className="items-end gap-0.5">
          <Text variant="small" tone="muted" align="right">
            {plural(semester.courses.length, 'course')}
          </Text>
          <Text variant="small" tone="muted" align="right">
            {`Minimum ${min}%`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Desktop: the same numbers as tiles. */
function OverallTiles({ semester, min }: { semester: StudentSemester; min: number }) {
  const percent = semester.overall_percent;
  const low = percent !== null && percent < min;
  const below = belowMinSummary(semester.courses, min);
  return (
    <View className="flex-row flex-wrap gap-5">
      <StatTile
        label="Overall this term"
        value={percent === null ? '—' : formatPercent(percent)}
        hint={percent === null ? 'No classes yet' : low ? `Below the ${min}% minimum` : `Minimum ${min}%`}
        tone={low ? 'warn' : 'default'}
      />
      <StatTile label="Courses" value={String(semester.courses.length)} hint={levelTermLabel(semester.level, semester.semester)} />
      <StatTile
        label={`Courses below ${min}%`}
        value={below.value}
        hint={below.hint}
        tone={below.low ? 'warn' : 'default'}
      />
    </View>
  );
}

/** /student: greeting, "Live now", overall attendance and the courses of this term. */
export default function StudentHome() {
  const { user } = useAuth();
  const { isDesktop } = useBreakpoint();
  const live = useLiveSessions();
  const userId = user?.id ?? '';

  const { data, error, loading, retrying, reload, refresh, pull } = useLoad(async () => {
    const [semesters, face, config] = await Promise.all([
      studentApi.semesters(userId),
      // The reminder is optional: the page works without the face status.
      facesApi.mine().catch(() => null),
      configApi.appCached(),
    ]);
    return { semesters: semesters.semesters ?? [], face, min: config.attendance_min_percent };
  }, [userId]);

  // A live class that ended is saved now: show the new numbers.
  useRefreshAfterLive(live.sessions, refresh);
  // Face registered or deleted on the face page (this page stays open under it): update the reminder.
  React.useEffect(() => onFaceChange(() => void refresh()), [refresh]);

  // The first view shows the page together with "Live now" (see LIVE_WAIT_MS).
  const liveKnown = live.sessions !== null;
  const [liveWaitOver, setLiveWaitOver] = React.useState(false);
  React.useEffect(() => {
    if (loading || liveKnown || liveWaitOver) return;
    const timer = setTimeout(() => setLiveWaitOver(true), LIVE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [loading, liveKnown, liveWaitOver]);
  const waitingForLive = !liveKnown && !liveWaitOver;

  const refreshLive = live.refresh;
  const pullBoth = React.useCallback(async () => {
    refreshLive();
    await pull();
  }, [refreshLive, pull]);

  if (!user) return null;
  const profile = user.student_profile;
  const semester = data
    ? currentSemester(data.semesters, profile ? { level: profile.current_level, term: profile.current_semester } : null)
    : undefined;
  const meta = [
    profile ? String(profile.student_id) : null,
    semester ? semester.label : profile ? levelTermLabel(profile.current_level, profile.current_semester) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const liveBanners = live.sessions?.length ? (
    <View className="gap-3">
      {live.sessions.map((session) => (
        <LiveBanner key={session.session_id} session={session} />
      ))}
    </View>
  ) : null;

  let body: React.ReactNode;
  if (loading || waitingForLive) {
    body = <LoadingState label="Loading your attendance…" />;
  } else if (error || !data) {
    body = (
      <Card>
        <ErrorState
          title="Couldn't load your attendance"
          message={error?.message ?? 'Please try again.'}
          onRetry={reload}
          retrying={retrying}
        />
      </Card>
    );
  } else if (!semester) {
    const hasPast = data.semesters.length > 0;
    body = (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title={hasPast ? "You're not in a current semester" : "You're not in a semester yet"}
          message={
            hasPast
              ? 'Your past semesters are under Courses. The department office adds you to the next one.'
              : 'Ask the department office to add you to your semester. Your courses show here after that.'
          }
        />
        {hasPast ? (
          <View className="items-center pb-4">
            <Link href="/student/courses" asChild>
              <Button label="See past semesters" icon={BookOpen} className="self-center" />
            </Link>
          </View>
        ) : null}
      </Card>
    );
  } else {
    const showFaceReminder = data.face !== null && !data.face.registered;
    body = (
      <>
        {showFaceReminder ? <FaceReminder /> : null}
        {isDesktop ? <OverallTiles semester={semester} min={data.min} /> : <OverallCard semester={semester} min={data.min} />}
        <Card
          title="Courses this term"
          padded={false}
          actions={
            <Link href="/student/courses" asChild>
              <TextLink label="All semesters" small />
            </Link>
          }
        >
          <View className="mt-2 pb-1">
            {semester.courses.length ? (
              semester.courses.map((course, index) => (
                <CourseRow
                  key={course.course_info_id}
                  courseInfoId={course.course_info_id}
                  code={course.course.code}
                  title={course.course.title}
                  teacher={isDesktop ? course.teacher?.userName : null}
                  attended={course.attended}
                  held={course.held}
                  percent={course.percent}
                  classesNeeded={course.classes_needed}
                  belowMin={course.below_min}
                  min={data.min}
                  divider={index > 0}
                />
              ))
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                message="Your semester has no courses yet. They show here when the department adds them."
              />
            )}
          </View>
        </Card>
      </>
    );
  }

  return (
    <Page onRefresh={pullBoth}>
      <PageHeader title={`Hi, ${firstName(user)}`} meta={meta || undefined} />
      {liveBanners}
      {body}
    </Page>
  );
}
