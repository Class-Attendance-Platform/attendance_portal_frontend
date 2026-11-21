import * as React from 'react';

import { configApi, DEFAULT_APP_CONFIG, type AppConfig } from '@/lib/api/config';

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
