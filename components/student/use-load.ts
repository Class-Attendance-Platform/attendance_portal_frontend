import { useFocusEffect } from 'expo-router';
import * as React from 'react';

import { useMessage } from '@/components/ui/message-bar';
import { onComeBack } from '@/hooks/onComeBack';
import { toApiError, type ApiError } from '@/lib/api/client';

export type LoadState<T> = {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  retrying: boolean;
  reload: () => void;
  refresh: () => Promise<void>;
  pull: () => Promise<void>;
};

export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList): LoadState<T> {
  const message = useMessage();
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);
  const latest = React.useRef(0);
  const hasData = React.useRef(false);
  const failed = React.useRef(false);
  const loader = React.useCallback(load, deps); // eslint-disable-line react-hooks/exhaustive-deps

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

  React.useEffect(() => {
    hasData.current = false;
    failed.current = false;
    setData(undefined);
    setError(undefined);
    setLoading(true);
    run('first');
  }, [run]);

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
