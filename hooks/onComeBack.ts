import { AppState, Platform } from 'react-native';

import { watchComeBack } from '@/lib/come-back';

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined';

/**
 * Calls `back` when the person comes back after leaving: the Android app returns to the front,
 * or the browser tab or desktop-app window is shown or focused again. Returns the unsubscribe.
 */
export function onComeBack(back: () => void): () => void {
  if (onWeb) return watchComeBack(back, { kind: 'web', document, window });
  return watchComeBack(back, { kind: 'app', appState: AppState });
}
