import { useFocusEffect, useNavigation } from 'expo-router';
import * as React from 'react';

import { onComeBack } from '@/hooks/onComeBack';
import { ApiError } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { focusAction, takeQuietAnswer } from './rules';

// Small data hooks for the admin pages.

export type LoadState<T> = {
  data: T | null;
  error: ApiError | null;
  /** True while a request runs (also while reloading with old data on screen; not for a quiet refresh). */
  loading: boolean;
  /** Loads again. Old data stays on screen meanwhile. */
  reload: () => Promise<void>;
  /** Changes the loaded data in place (after a save). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

export type LoadOptions = {
  /**
   * Loads again quietly when the page comes back into view (Back, a crumb or its nav item going
   * back to it, or coming back to the browser tab, window or app): the data stays on screen, no
   * spinner, and a failure keeps the old data (except a 403 or 404: the item is gone, so that
   * error shows).
   */
  refreshOnFocus?: boolean;
};

/**
 * Runs `load` now and whenever `deps` change. A newer request always wins over an older one that
 * answers late (e.g. typing in a search box).
 */
export function useLoad<T>(
  load: () => Promise<T>,
  deps: React.DependencyList,
  { refreshOnFocus = false }: LoadOptions = {}
): LoadState<T> {
  const [data, setLoaded] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const latest = React.useRef(0);
  // The newest request has not answered yet.
  const running = React.useRef(false);
  // The page came back while that request ran: refresh once it answers.
  const again = React.useRef(false);
  // Changes made on screen with setData; a quiet answer that started before one is dropped.
  const edits = React.useRef(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const dataRef = React.useRef(data);
  dataRef.current = data;
  const refreshOnFocusRef = React.useRef(refreshOnFocus);
  refreshOnFocusRef.current = refreshOnFocus;

  // `quiet` (a refresh on return): no spinner, a failure keeps what is on screen, and the answer is
  // dropped when setData changed the data meanwhile (it would undo a save shown in place).
  const run = React.useCallback(async (quiet: boolean) => {
    latest.current += 1;
    const id = latest.current;
    const editsAtStart = edits.current;
    running.current = true;
    if (!quiet) setLoading(true);
    try {
      const result = await loadRef.current();
      if (quiet ? !takeQuietAnswer(id, latest.current, editsAtStart, edits.current) : id !== latest.current) return;
      setLoaded(result);
      setError(null);
    } catch (caught) {
      if (id !== latest.current) return;
      const problem = toApiError(caught);
      if (!quiet) setError(problem);
      else if (problem.status === 403 || problem.status === 404) {
        // Not a network blip: the item is gone (deleted elsewhere) or closed to this admin now.
        setLoaded(null);
        setError(problem);
      }
    } finally {
      if (id === latest.current) {
        running.current = false;
        if (!quiet) setLoading(false);
        if (again.current) {
          again.current = false;
          void run(true);
        }
      }
    }
  }, []);

  const reload = React.useCallback(() => run(false), [run]);

  const setData = React.useCallback<React.Dispatch<React.SetStateAction<T | null>>>((value) => {
    edits.current += 1;
    setLoaded(value);
    if (value === null) setError(null); // a new view starts clean: its spinner, not the old view's error
  }, []);

  React.useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const onReturn = React.useCallback(() => {
    if (!refreshOnFocusRef.current) return;
    const action = focusAction(running.current, dataRef.current !== null);
    if (action === 'refresh') void run(true);
    else if (action === 'load') void run(false);
    else again.current = true;
  }, [run]);

  // useFocusEffect also runs when a page opens: skip that one, its load is already on its way. A
  // list that mounted while its page was hidden (a tab that loaded in the background) gets no such
  // call, so its first one is a real return. The callback stays the same (it reads refs), or it
  // would run again on every render. While the page is in view, coming back to the tab, window or
  // app does the same as going Back to it.
  const navigation = useNavigation();
  const firstFocus = React.useRef<boolean | null>(null);
  if (firstFocus.current === null) firstFocus.current = navigation.isFocused();
  useFocusEffect(
    React.useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        onReturn();
      }
      return onComeBack(onReturn);
    }, [onReturn])
  );

  React.useEffect(
    () => () => {
      latest.current += 1; // ignore answers after the page is gone
    },
    []
  );

  return { data, error, loading, reload, setData };
}

/** The server's app settings (minimum %, levels, terms); defaults until it answers. */
export { useAppConfig } from '@/hooks/useAppConfig';

/** A value that follows `value` after it has stopped changing for `delay` ms (search boxes). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
