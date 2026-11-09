import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

import { useMessage } from '@/components/ui/message-bar';
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
  /**
   * Pull to refresh (phones): loads again quietly and says so in the message bar when that fails
   * while the old data stays on screen (an error screen shows the new error itself).
   */
  pull: () => Promise<void>;
};

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined';

/**
 * Calls `back` when the student comes back after leaving: the Android app returns to the front,
 * or the browser tab or desktop-app window is shown or focused again. Returns the unsubscribe.
 */
function onComeBack(back: () => void): () => void {
  let away = false;
  const leave = () => {
    away = true;
  };
  const arrive = () => {
    if (!away) return;
    away = false;
    back();
  };
  if (onWeb) {
    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : arrive());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', leave);
    window.addEventListener('focus', arrive);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', arrive);
    };
  }
  const subscription = AppState.addEventListener('change', (state) => (state === 'active' ? arrive() : leave()));
  return () => subscription.remove();
}

/**
 * Loads data for a screen: loading → data or error (with retry). It loads again quietly when the
 * screen comes back into focus (back from another page) and when the student comes back to the
 * app, browser tab or window while it shows; a screen that failed tries again then too. A late
 * answer from an older request never replaces a newer one.
 */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList): LoadState<T> {
  const message = useMessage();
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);
  const latest = React.useRef(0);
  const hasData = React.useRef(false);
  // The last load failed with nothing to show (an error screen).
  const failed = React.useRef(false);
  // The loader changes only when `deps` change (the caller's inputs).
  const loader = React.useCallback(load, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolves to the error of a quiet load that failed while the data stayed on screen.
  const run = React.useCallback(
    async (mode: 'first' | 'retry' | 'quiet'): Promise<ApiError | undefined> => {
      const id = ++latest.current;
      if (mode === 'retry') setRetrying(true);
      let kept: ApiError | undefined;
      try {
        const result = await loader();
        if (id !== latest.current) return undefined;
        hasData.current = true;
        failed.current = false;
        setData(result);
        setError(undefined);
      } catch (caught) {
        if (id !== latest.current) return undefined;
        // A quiet refresh keeps the data on screen when it fails.
        if (mode === 'quiet' && hasData.current) {
          kept = toApiError(caught);
        } else {
          failed.current = true;
          setError(toApiError(caught));
        }
      } finally {
        if (id === latest.current) {
          setLoading(false);
          setRetrying(false);
        }
      }
      return kept;
    },
    [loader]
  );

  // New inputs (e.g. another course id): start over.
  React.useEffect(() => {
    hasData.current = false;
    failed.current = false;
    setData(undefined);
    setError(undefined);
    setLoading(true);
    run('first');
  }, [run]);

  // Back on this screen: refresh quietly (the first focus is the first load). While it shows,
  // also when the student comes back to the app or the browser tab.
  const focusedOnce = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
      } else if (hasData.current || failed.current) {
        run('quiet');
      }
      return onComeBack(() => {
        run('quiet');
      });
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
    refresh: React.useCallback(async () => {
      await run('quiet');
    }, [run]),
    pull: React.useCallback(async () => {
      const kept = await run('quiet');
      if (kept) message.error(kept.message, "Couldn't refresh");
    }, [run, message]),
  };
}
