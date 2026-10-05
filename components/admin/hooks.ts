import * as React from 'react';

import { ApiError, configApi, DEFAULT_APP_CONFIG, type AppConfig } from '@/lib/api';
import { toApiError } from '@/lib/api/client';

// Small data hooks for the admin pages.

export type LoadState<T> = {
  data: T | null;
  error: ApiError | null;
  /** True while a request runs (also while reloading with old data on screen). */
  loading: boolean;
  /** Loads again. Old data stays on screen meanwhile. */
  reload: () => Promise<void>;
  /** Changes the loaded data in place (after a save). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

/**
 * Runs `load` now and whenever `deps` change. A newer request always wins over an older one that
 * answers late (e.g. typing in a search box).
 */
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList): LoadState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const latest = React.useRef(0);
  const loadRef = React.useRef(load);
  loadRef.current = load;

  const reload = React.useCallback(async () => {
    latest.current += 1;
    const id = latest.current;
    setLoading(true);
    try {
      const result = await loadRef.current();
      if (id !== latest.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (id !== latest.current) return;
      setError(toApiError(caught));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(
    () => () => {
      latest.current += 1; // ignore answers after the page is gone
    },
    []
  );

  return { data, error, loading, reload, setData };
}

/** The server's app settings (minimum %, levels, terms); defaults until it answers. */
export function useAppConfig(): AppConfig {
  const [config, setConfig] = React.useState<AppConfig>(DEFAULT_APP_CONFIG);
  React.useEffect(() => {
    let alive = true;
    configApi.appCached().then((value) => {
      if (alive) setConfig(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

/** A value that follows `value` after it has stopped changing for `delay` ms (search boxes). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
