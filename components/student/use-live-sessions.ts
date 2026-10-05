import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { studentApi, type StudentLiveSession } from '@/lib/api/student';

/** How often the "Live now" list is asked for while a screen shows it. */
export const LIVE_POLL_MS = 25000;

export type LiveSessions = {
  /** Live sessions in the student's current courses; null until the first answer. */
  sessions: StudentLiveSession[] | null;
  /** Asks again now (e.g. after checking in). */
  refresh: () => void;
};

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined';
const pageHidden = () => onWeb && document.visibilityState === 'hidden';

/**
 * GET /student/live/ while the screen is focused: at once, then every 25 s (skipped while the
 * browser tab is hidden, asked again when it shows). Failures keep the last list. The server
 * decides what is live (the phone's clock may be wrong), so nothing is filtered here.
 */
export function useLiveSessions(): LiveSessions {
  const [sessions, setSessions] = React.useState<StudentLiveSession[] | null>(null);
  const latest = React.useRef(0);

  const check = React.useCallback(async () => {
    const id = ++latest.current;
    try {
      const response = await studentApi.live();
      if (id === latest.current) setSessions(response.sessions ?? []);
    } catch {
      // Keep the last list; the next check tries again.
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
      return () => {
        clearInterval(timer);
        latest.current += 1; // drop answers that arrive after leaving
        if (onWeb) document.removeEventListener('visibilitychange', onVisible);
      };
    }, [check])
  );

  return { sessions, refresh: check };
}
