import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

import { studentApi, type StudentLiveSession } from '@/lib/api/student';
import { liveEnded } from './logic';

export const LIVE_POLL_MS = 25000;

export type LiveSessions = {
  sessions: StudentLiveSession[] | null;
  failed: boolean;
  refresh: () => void;
};

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined';
const pageHidden = () => (onWeb ? document.visibilityState === 'hidden' : AppState.currentState === 'background');

export function useLiveSessions(): LiveSessions {
  const [sessions, setSessions] = React.useState<StudentLiveSession[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const latest = React.useRef(0);

  const check = React.useCallback(async () => {
    const id = ++latest.current;
    try {
      const response = await studentApi.live();
      if (id !== latest.current) return;
      setSessions(response.sessions ?? []);
      setFailed(false);
    } catch {
      if (id === latest.current) setFailed(true);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      check();
      const timer = setInterval(() => {
        if (!pageHidden()) check();
      }, LIVE_POLL_MS);
      const onVisible = () => {
        if (!pageHidden()) check();
      };
      if (onWeb) document.addEventListener('visibilitychange', onVisible);
      const subscription = onWeb
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') check();
          });
      return () => {
        clearInterval(timer);
        latest.current += 1;
        if (onWeb) document.removeEventListener('visibilitychange', onVisible);
        subscription?.remove();
      };
    }, [check])
  );

  return { sessions, failed, refresh: check };
}

export function useRefreshAfterLive(
  sessions: StudentLiveSession[] | null,
  refresh: () => unknown,
  courseInfoId?: string
): void {
  const before = React.useRef<{ course: string | undefined; ids: string[] } | null>(null);
  React.useEffect(() => {
    if (sessions === null) return;
    const ids = sessions
      .filter((session) => !courseInfoId || session.course_info_id === courseInfoId)
      .map((session) => session.session_id);
    const last = before.current;
    const previous = last && last.course === courseInfoId ? last.ids : null;
    before.current = { course: courseInfoId, ids };
    if (liveEnded(previous, ids)) refresh();
  }, [sessions, refresh, courseInfoId]);
}
