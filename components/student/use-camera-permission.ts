import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

export function useCameraPermission() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);

  const shown = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!shown.current) {
        shown.current = true;
        return;
      }
      if (Platform.OS !== 'web') getPermission().catch(() => {});
    }, [getPermission])
  );

  return [permission, requestPermission, getPermission] as const;
}
