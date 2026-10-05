import * as React from 'react';

import { ApiError, toApiError } from '@/lib/api/client';
import { sessionsApi, type CheckedInStudent, type LiveStatus, type SessionCode } from '@/lib/api/sessions';
import type { UUID } from '@/lib/api/types';
import { CODE_MAX_WAIT_MS, codeRefetchDelay } from './rules';

// One live session, polled: the code (refetched when it changes, at least every 5 s), the
// status lists (every 5 s) and the time left (counted down every second, text only).

/** Poll the lists this often. */
const STATUS_EVERY_MS = 5000;

export type LiveLists = LiveStatus['session'];

export type SessionEnd = {
  /** How it ended here: saved by "End and save" or the timer, cancelled, or gone (404). */
  how: 'saved' | 'cancelled' | 'gone' | 'ended';
  saved: boolean;
  totalPresent: number | null;
  /** Students enrolled (last known), for "10 of 12 present". */
  total: number | null;
};

export type LiveSessionState = {
  code: SessionCode | null;
  lists: LiveLists | null;
  /** Seconds left, counted down locally from the server's time_left. */
  timeLeft: number | null;
  end: SessionEnd | null;
  /** The first status load failed (nothing to show yet). */
  error: ApiError | null;
  /** A later poll failed: the numbers on screen may be old. */
  connectionProblem: boolean;
  /** Load again after an error. */
  retry: () => void;
  extend: (minutes?: number) => Promise<void>;
  mark: (profileId: UUID) => Promise<CheckedInStudent>;
  stop: () => Promise<SessionEnd>;
  cancel: () => Promise<void>;
};

export function useLiveSession(sessionId: UUID | null | undefined): LiveSessionState {
  const [code, setCode] = React.useState<SessionCode | null>(null);
  const [lists, setLists] = React.useState<LiveLists | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [end, setEnd] = React.useState<SessionEnd | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [connectionProblem, setConnectionProblem] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  // Local clock time when the session ends (from the server's time_left: no clock skew).
  const endsAt = React.useRef<number | null>(null);
  const endRef = React.useRef<SessionEnd | null>(null);
  const totalRef = React.useRef<number | null>(null);
  const statusBusy = React.useRef(false);
  const lastStatusAt = React.useRef(0);

  const finish = React.useCallback((next: SessionEnd) => {
    if (endRef.current) return;
    endRef.current = next;
    setEnd(next);
    setTimeLeft(0);
  }, []);

  const setTimer = (seconds: number) => {
    endsAt.current = Date.now() + Math.max(0, seconds) * 1000;
    setTimeLeft(Math.max(0, Math.round(seconds)));
  };

  const fetchStatus = React.useCallback(async () => {
    if (!sessionId || endRef.current || statusBusy.current) return;
    statusBusy.current = true;
    lastStatusAt.current = Date.now();
    try {
      const status = await sessionsApi.status(sessionId);
      if (endRef.current) return;
      if (status.active) {
        totalRef.current = status.session.total;
        setLists(status.session);
        setTimer(status.session.time_left);
      } else {
        finish({ how: 'ended', saved: status.saved, totalPresent: status.total_present, total: totalRef.current });
      }
      setError(null);
      setConnectionProblem(false);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.status === 404) {
        finish({ how: 'gone', saved: false, totalPresent: null, total: totalRef.current });
      } else if (apiError.status === 410) {
        finish({ how: 'ended', saved: true, totalPresent: null, total: totalRef.current });
      } else {
        setError((current) => current ?? apiError);
        setConnectionProblem(true);
      }
    } finally {
      statusBusy.current = false;
    }
  }, [sessionId, finish]);

  // Reset when the session changes.
  React.useEffect(() => {
    endRef.current = null;
    endsAt.current = null;
    totalRef.current = null;
    setCode(null);
    setLists(null);
    setTimeLeft(null);
    setEnd(null);
    setError(null);
    setConnectionProblem(false);
  }, [sessionId]);

  // Status: now, then every 5 s.
  React.useEffect(() => {
    if (!sessionId) return;
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), STATUS_EVERY_MS);
    return () => clearInterval(id);
  }, [sessionId, fetchStatus, attempt]);

  // The code: refetch when it changes, and at least every 5 s.
  React.useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      if (!alive || endRef.current) return;
      let wait = CODE_MAX_WAIT_MS;
      try {
        const next = await sessionsApi.code(sessionId);
        if (!alive) return;
        setCode(next);
        wait = codeRefetchDelay(next.expires_in);
      } catch (caught) {
        const apiError = toApiError(caught);
        if (apiError.status === 410 || apiError.status === 404) {
          void fetchStatus();
          return;
        }
        if (alive) setConnectionProblem(true);
      }
      if (alive && !endRef.current) timer = setTimeout(load, wait);
    };
    void load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, fetchStatus, attempt]);

  // Time left: every second; at zero ask the server (it saves the session).
  React.useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      if (endRef.current || endsAt.current === null) return;
      const seconds = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setTimeLeft(seconds);
      if (seconds === 0 && Date.now() - lastStatusAt.current > 1500) void fetchStatus();
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId, fetchStatus]);

  const extend = React.useCallback(
    async (minutes = 2) => {
      if (!sessionId) return;
      const result = await sessionsApi.extend(sessionId, minutes);
      setTimer(result.time_left);
      setLists((current) => (current ? { ...current, ends_at: result.ends_at, time_left: result.time_left } : current));
    },
    [sessionId]
  );

  const mark = React.useCallback(
    async (profileId: UUID) => {
      if (!sessionId) throw new ApiError('No session.');
      try {
        const result = await sessionsApi.mark(sessionId, profileId);
        setLists((current) =>
          current
            ? {
                ...current,
                not_checked_in: current.not_checked_in.filter((student) => student.profile_id !== profileId),
                checked_in: [result.student, ...current.checked_in.filter((student) => student.profile_id !== profileId)],
              }
            : current
        );
        return result.student;
      } catch (caught) {
        void fetchStatus();
        throw toApiError(caught);
      }
    },
    [sessionId, fetchStatus]
  );

  const stop = React.useCallback(async () => {
    if (!sessionId) throw new ApiError('No session.');
    const result = await sessionsApi.stop(sessionId);
    const next: SessionEnd = { how: 'saved', saved: true, totalPresent: result.total_present, total: totalRef.current };
    finish(next);
    return endRef.current ?? next;
  }, [sessionId, finish]);

  const cancel = React.useCallback(async () => {
    if (!sessionId) return;
    await sessionsApi.cancel(sessionId);
    finish({ how: 'cancelled', saved: false, totalPresent: null, total: totalRef.current });
  }, [sessionId, finish]);

  const retry = React.useCallback(() => {
    setError(null);
    setConnectionProblem(false);
    setAttempt((value) => value + 1);
  }, []);

  return { code, lists, timeLeft, end, error, connectionProblem, retry, extend, mark, stop, cancel };
}

/** "Saved: 10 of 12 present." for a finished session. */
export function endSummary(end: SessionEnd): string {
  if (end.how === 'cancelled') return 'Session cancelled. Nothing was saved.';
  if (end.how === 'gone') return 'This session was cancelled or does not exist. Nothing was saved.';
  if (!end.saved) return 'The session ended.';
  if (end.totalPresent === null) return 'The session ended and attendance was saved.';
  const of = end.total !== null ? ` of ${end.total}` : '';
  return `Attendance saved: ${end.totalPresent}${of} present.`;
}
