import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';

/**
 * Asks before leaving a page with unsaved work while `active`:
 * - going back (Android back button, a Back link that goes back): the app's own confirm dialog;
 * - web reload or closing the tab: the browser's own "Leave site?" question (the desktop app asks
 *   in desktop/main.js).
 * Links that open another page keep this one underneath (Stack), so nothing is lost there.
 */
export function useLeaveGuard(active: boolean, ask: ConfirmOptions) {
  const navigation = useNavigation();
  const confirm = useConfirm();
  const askRef = React.useRef(ask);
  askRef.current = ask;

  usePreventRemove(active, ({ data }) => {
    void confirm({ destructive: true, ...askRef.current }).then((leave) => {
      if (leave) navigation.dispatch(data.action);
    });
  });

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
