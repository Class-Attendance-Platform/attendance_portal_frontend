import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as React from 'react';
import { Platform } from 'react-native';

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined';

export function useKeepScreenOn(on: boolean) {
  const tag = React.useId();
  React.useEffect(() => {
    if (!on) return;
    let steps: Promise<unknown> = activateKeepAwakeAsync(tag).catch(() => {});
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      steps = steps
        .then(() => deactivateKeepAwake(tag))
        .catch(() => {})
        .then(() => activateKeepAwakeAsync(tag))
        .catch(() => {});
    };
    if (onWeb) document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (onWeb) document.removeEventListener('visibilitychange', onVisible);
      void steps.then(() => deactivateKeepAwake(tag)).catch(() => {});
    };
  }, [on, tag]);
}

export function enterFullScreen() {
  if (!onWeb || document.fullscreenElement) return;
  try {
    void document.documentElement.requestFullscreen?.()?.catch(() => {});
  } catch {
  }
}

export function leaveFullScreen() {
  if (!onWeb || !document.fullscreenElement) return;
  try {
    void document.exitFullscreen?.()?.catch(() => {});
  } catch {
  }
}
