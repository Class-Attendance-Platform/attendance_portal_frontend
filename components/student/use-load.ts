import { useFocusEffect } from 'expo-router';
import * as React from 'react';

import { toApiError, type ApiError } from '@/lib/api/client';

export type LoadState<T> = {
  data: T | undefined;
  error: ApiError | undefined;
  /** First load (nothing to show yet). */
  loading: boolean;
  /** "Try again" after an error is running. */
  retrying: boolean;
  /** Loads again, showing the retry spinner on an error screen. */
  reload: () => void;
  /** Loads again quietly (keeps what is on screen; errors are ignored while data is shown). */
  refresh: () => Promise<void>;
};

/**
 * Loads data for a screen: loading → data or error (with retry). When the screen comes back
 * into focus (back from another page) it refreshes quietly. A late answer from an older request
 * never replaces a newer one.
 */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList): LoadState<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);
  const latest = React.useRef(0);
  const hasData = React.useRef(false);
  // The loader changes only when `deps` change (the caller's inputs).
  const loader = React.useCallback(load, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const run = React.useCallback(
    async (mode: 'first' | 'retry' | 'quiet') => {
      const id = ++latest.current;
      if (mode === 'retry') setRetrying(true);
      try {
        const result = await loader();
        if (id !== latest.current) return;
        hasData.current = true;
        setData(result);
        setError(undefined);
      } catch (caught) {
        if (id !== latest.current) return;
        // A quiet refresh keeps the data on screen when it fails.
        if (mode !== 'quiet' || !hasData.current) setError(toApiError(caught));
      } finally {
        if (id === latest.current) {
          setLoading(false);
          setRetrying(false);
        }
      }
    },
    [loader]
  );

  // New inputs (e.g. another course id): start over.
  React.useEffect(() => {
    hasData.current = false;
    setData(undefined);
    setError(undefined);
    setLoading(true);
    run('first');
  }, [run]);

  // Back on this screen: refresh quietly (the first focus is the first load).
  const focusedOnce = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      if (hasData.current) run('quiet');
    }, [run])
  );

  return {
    data,
    error,
    loading,
    retrying,
    reload: React.useCallback(() => {
      run('retry');
    }, [run]),
    refresh: React.useCallback(() => run('quiet'), [run]),
  };
}
