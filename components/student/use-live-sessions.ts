import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

import { studentApi, type StudentLiveSession } from '@/lib/api/student';
import { liveEnded } from './logic';

/** How often the "Live now" list is asked for while a screen shows it. */
export const LIVE_POLL_MS = 25000;

export type LiveSessions = {
  /** Live sessions in the student's current courses; null until the first answer. */
  sessions: StudentLiveSession[] | null;
  /** The last request failed (the list, if any, is from an earlier answer). */
  failed: boolean;
  /** Asks again now (e.g. after checking in). */
  refresh: () => void;
};

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined';
// A hidden browser tab, or the app in the background (Android): no polling.
const pageHidden = () => (onWeb ? document.visibilityState === 'hidden' : AppState.currentState === 'background');

/**
 * GET /student/live/ while the screen is focused: at once, then every 25 s (skipped while the
 * browser tab is hidden or the app is in the background, asked again when it shows). Failures
 * keep the last list (and set `failed`). The server decides what is live (the phone's clock may
 * be wrong), so nothing is filtered here.
 */
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
      // Keep the last list; the next check tries again.
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
      // Android: back to the front.
      const subscription = onWeb
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') check();
          });
      return () => {
        clearInterval(timer);
        latest.current += 1; // drop answers that arrive after leaving
        if (onWeb) document.removeEventListener('visibilitychange', onVisible);
        subscription?.remove();
      };
    }, [check])
  );

  return { sessions, failed, refresh: check };
}

/**
 * Calls `refresh` right after a live class ends (its session leaves the "Live now" list: the
 * teacher stopped it or its timer ran out, so it is saved), so the numbers on screen include that
 * class. `courseInfoId`: only that course's sessions count.
 */
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
