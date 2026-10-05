import { Link } from 'expo-router';
import { ClipboardList, History } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { StatTile } from '@/components/ui/stat-tile';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { LiveSession } from '@/lib/api/sessions';
import { teacherApi, type TeacherCourse } from '@/lib/api/teacher';
import type { UUID } from '@/lib/api/types';
import { formatPercent, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { courseHref, isFinished, rollCallHref } from './labels';
import { CheckedInList, LivePanel, WaitingList } from './live-panel';
import { StartSessionCard } from './start-session-card';
import { useLoad } from './use-load';
import { endSummary, useLiveSession } from './use-live-session';

type Running = Pick<LiveSession, 'id' | 'delivery'>;

export function CourseStats({ course, minPercent }: { course: TeacherCourse; minPercent: number }) {
  const below = course.below_min_count;
  return (
    <View className="flex-row flex-wrap gap-4">
      <StatTile label="Classes held" value={String(course.classes_held)} />
      <StatTile label="Average attendance" value={formatPercent(course.average_percent)} />
      <StatTile
        label={`Below ${minPercent}%`}
        value={plural(below, 'student')}
        tone={below > 0 ? 'warn' : 'default'}
      />
      <StatTile label="Faces registered" value={`${course.face_registered_count} / ${course.student_count}`} />
    </View>
  );
}

/** The live session: QR and code, the lists, and what happens when it ends. */
function LiveArea({
  session,
  course,
  onEnded,
}: {
  session: Running;
  course: TeacherCourse;
  onEnded: (sessionId: UUID, summary: string, saved: boolean) => void;
}) {
  const live = useLiveSession(session.id);
  const { width, isDesktop } = useBreakpoint();
  const twoColumns = isDesktop && width >= 1100;
  const ended = React.useRef(false);

  React.useEffect(() => {
    if (!live.end || ended.current) return;
    ended.current = true;
    onEnded(session.id, endSummary(live.end), live.end.saved);
  }, [live.end, onEnded, session.id]);

  if (!live.lists && live.error) {
    return (
      <Card>
        <ErrorState title="Couldn't load the live session" message={live.error.message} onRetry={live.retry} />
      </Card>
    );
  }

  return (
    <View className={cn('gap-5', twoColumns && 'flex-row items-start')}>
      <View className={cn(twoColumns ? 'flex-[1.15]' : 'w-full')}>
        <LivePanel session={session} courseInfoId={course.course_info_id} live={live} />
      </View>
      <View className={cn('gap-5', twoColumns ? 'flex-1' : 'w-full')}>
        <WaitingList live={live} />
        <CheckedInList live={live} />
      </View>
    </View>
  );
}

export type AttendanceTabProps = {
  course: TeacherCourse;
  minPercent: number;
  /** Reload the course numbers (after a session is saved). */
  onChanged: () => void;
};

/** ?tab=attendance: start a session, or the running one (also after a reload). */
export function AttendanceTab({ course, minPercent, onChanged }: AttendanceTabProps) {
  const message = useMessage();
  const courseInfoId: UUID = course.course_info_id;
  const finished = isFinished(course);
  const [running, setRunning] = React.useState<Running | null>(null);
  const [lastResult, setLastResult] = React.useState<string | null>(null);

  // Sessions that ended here: a slower reload must not reopen them.
  const endedIds = React.useRef(new Set<UUID>());

  // Reopen a running session after a reload (or one started on another device).
  const lookup = useLoad(() => teacherApi.liveSession(courseInfoId), [courseInfoId]);
  React.useEffect(() => {
    const session = lookup.data?.session;
    if (session && !endedIds.current.has(session.id)) setRunning(session);
  }, [lookup.data]);
  // The course reloads when the page comes back into view: pick up a session started meanwhile.
  React.useEffect(() => {
    const id = course.live_session_id;
    if (id && !endedIds.current.has(id)) setRunning((current) => current ?? { id, delivery: 'IN_CLASS' });
  }, [course.live_session_id]);

  const onStarted = React.useCallback(
    (session: LiveSession | { id: UUID }) => {
      setLastResult(null);
      setRunning({ id: session.id, delivery: 'delivery' in session ? session.delivery : 'IN_CLASS' });
      if (!('delivery' in session)) message.info('A session was already running for this course. Here it is.');
      onChanged();
    },
    [message, onChanged]
  );

  const setLookup = lookup.setData;
  const onEnded = React.useCallback(
    (sessionId: UUID, summary: string, saved: boolean) => {
      endedIds.current.add(sessionId);
      setRunning(null);
      setLookup({ success: true, session: null });
      if (saved) {
        setLastResult(summary);
        message.success(summary);
      } else {
        message.info(summary);
      }
      onChanged();
    },
    [message, onChanged, setLookup]
  );

  let body: React.ReactNode;
  if (lookup.loading && !running) {
    body = (
      <Card>
        <LoadingState label="Checking for a running session…" />
      </Card>
    );
  } else if (lookup.error && !running) {
    body = (
      <Card>
        <ErrorState message={lookup.error.message} onRetry={() => lookup.reload()} />
      </Card>
    );
  } else if (running) {
    body = <LiveArea key={running.id} session={running} course={course} onEnded={onEnded} />;
  } else if (finished) {
    body = (
      <Card title="Attendance for a finished semester" className="gap-3">
        <Notice
          tone="info"
          message="This semester is finished, so live sessions and class photos are off. You can still correct days in History and add or fix a class with Roll call."
        />
        <View className="flex-row flex-wrap gap-3">
          <Link href={rollCallHref(courseInfoId)} asChild>
            <Button label="Roll call" icon={ClipboardList} />
          </Link>
          <Link href={courseHref(courseInfoId, 'history')} asChild>
            <Button label="Open History" icon={History} />
          </Link>
        </View>
      </Card>
    );
  } else {
    body = (
      <View className="gap-4">
        {lastResult ? (
          <Notice tone="success" title="Session saved" message={`${lastResult} You can check or correct it in History.`}>
            <Link href={courseHref(courseInfoId, 'history')} asChild>
              <Button label="Open History" compact />
            </Link>
          </Notice>
        ) : null}
        <StartSessionCard courseInfoId={courseInfoId} onStarted={onStarted} />
      </View>
    );
  }

  return (
    <View className="gap-5">
      {body}
      <CourseStats course={course} minPercent={minPercent} />
    </View>
  );
}
