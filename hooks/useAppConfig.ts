import * as React from 'react';

import { configApi, DEFAULT_APP_CONFIG, type AppConfig } from '@/lib/api/config';

/**
 * The server's app settings from GET /config/app/ (name, minimum %, levels, terms, versions).
 * Fetched once per app start and shared; DEFAULT_APP_CONFIG until it answers or when it can't.
 */
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
