import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';
import { watchHistory, type HistoryWindow } from './leaveGuardHistory';

let browserHistory: ReturnType<typeof watchHistory> | null = null;

export function watchBrowserHistory() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!browserHistory) browserHistory = watchHistory(window as unknown as HistoryWindow);
  return browserHistory;
}

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
