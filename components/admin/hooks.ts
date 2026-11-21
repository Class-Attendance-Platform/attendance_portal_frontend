import { useFocusEffect, useNavigation } from 'expo-router';
import * as React from 'react';

import { onComeBack } from '@/hooks/onComeBack';
import { ApiError } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { focusAction, takeQuietAnswer } from './rules';

export type LoadState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

export type LoadOptions = {
  refreshOnFocus?: boolean;
};

export function useLoad<T>(
  load: () => Promise<T>,
  deps: React.DependencyList,
  { refreshOnFocus = false }: LoadOptions = {}
): LoadState<T> {
  const [data, setLoaded] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const latest = React.useRef(0);
  const running = React.useRef(false);
  const again = React.useRef(false);
  const edits = React.useRef(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const dataRef = React.useRef(data);
  dataRef.current = data;
  const refreshOnFocusRef = React.useRef(refreshOnFocus);
  refreshOnFocusRef.current = refreshOnFocus;

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
    if (value === null) setError(null);
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
      latest.current += 1;
    },
    []
  );

  return { data, error, loading, reload, setData };
}

export { useAppConfig } from '@/hooks/useAppConfig';

export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
