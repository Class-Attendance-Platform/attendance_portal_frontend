import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

/**
 * expo-camera's useCameraPermissions, read again when the app comes back to the front or the
 * screen is shown again. expo's hook reads it only once, but on a phone the student may turn
 * camera access on in the phone settings ("Open phone settings") or on another screen meanwhile.
 * Not on the web: there "Allow camera" asks the browser again.
 */
export function useCameraPermission() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);

  // The first time, expo's hook reads it itself.
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
