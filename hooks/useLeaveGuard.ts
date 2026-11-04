import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';
import { watchHistory, type HistoryWindow } from './leaveGuardHistory';

let browserHistory: ReturnType<typeof watchHistory> | null = null;

/**
 * Web: starts watching the browser's Back and Forward buttons for useLeaveGuard (once). The root
 * layout calls it as the app loads, so its listener is in place before expo-router's.
 */
export function watchBrowserHistory() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  // The DOM types here have no Navigation API yet (window.navigation); the module checks for it.
  if (!browserHistory) browserHistory = watchHistory(window as unknown as HistoryWindow);
  return browserHistory;
}

/**
 * Asks before leaving a page with unsaved work while `active`:
 * - going back in the app (Android back button, a Back link or breadcrumb that goes back): the
 *   app's own confirm dialog;
 * - the browser's Back and Forward buttons (web, while the page is in front): the page stays and
 *   the same question is asked;
 * - web reload or closing the tab: the browser's own "Leave site?" question (the desktop app asks
 *   in desktop/main.js).
 * Links that open another page keep this one underneath (Stack), so nothing is lost there.
 */
export function useLeaveGuard(active: boolean, ask: ConfirmOptions) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const confirm = useConfirm();
  const askRef = React.useRef(ask);
  askRef.current = ask;

  usePreventRemove(active, ({ data }) => {
    void confirm({ destructive: true, ...askRef.current }).then((leave) => {
      if (leave) navigation.dispatch(data.action);
    });
  });

  React.useEffect(() => {
    const history = watchBrowserHistory();
    if (!history || !active || !focused) return;
    return history.guard(() => confirm({ destructive: true, ...askRef.current }));
  }, [active, focused, confirm]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}
