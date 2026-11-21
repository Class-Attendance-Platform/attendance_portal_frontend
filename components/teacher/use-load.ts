import { useFocusEffect } from 'expo-router';
import * as React from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError, toApiError } from '@/lib/api/client';

export type Loaded<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: (options?: { quiet?: boolean }) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList, { refreshOnFocus = false } = {}): Loaded<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const request = React.useRef(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;

  const reload = React.useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    const id = ++request.current;
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await loadRef.current();
      if (id !== request.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (id !== request.current) return;
      if (!quiet) setError(toApiError(caught));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setData(null);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const firstFocus = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
      } else if (refreshOnFocus) {
        void reload({ quiet: true });
      }
    }, [refreshOnFocus, reload])
  );

  return { data, error, loading, reload, setData };
}

export function useMinPercent(): number {
  return useAppConfig().attendance_min_percent;
}
