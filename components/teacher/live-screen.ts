import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as React from 'react';
import { Platform } from 'react-native';

// The screen while a live session's QR and code are shown: kept on, and full screen on the web.

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined';

/**
 * Keeps the screen on while `on` is true, so the QR doesn't disappear when the phone or laptop
 * would dim. Phones keep the app's window on; the web takes a screen wake lock, which the browser
 * drops when the tab is hidden, so it is taken again when the tab shows. Where it isn't
 * possible (an old browser), nothing happens.
 */
export function useKeepScreenOn(on: boolean) {
  const tag = React.useId();
  React.useEffect(() => {
    if (!on) return;
    // Each step waits for the one before, so a lock that is still being taken is released too.
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

/** Web: show the whole page full screen. Call it from a press (browsers allow it only then). */
export function enterFullScreen() {
  if (!onWeb || document.fullscreenElement) return;
  try {
    void document.documentElement.requestFullscreen?.()?.catch(() => {});
  } catch {
    // Not possible here (e.g. an iPhone): the page still fills the browser window.
  }
}

/** Web: leave full screen, if the page is in it. */
export function leaveFullScreen() {
  if (!onWeb || !document.fullscreenElement) return;
  try {
    void document.exitFullscreen?.()?.catch(() => {});
  } catch {
    // Already leaving.
  }
}
