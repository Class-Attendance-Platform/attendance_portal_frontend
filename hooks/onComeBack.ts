import { AppState, Platform } from 'react-native';

import { watchComeBack } from '@/lib/come-back';

const onWeb = Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined';

export function onComeBack(back: () => void): () => void {
  if (onWeb) return watchComeBack(back, { kind: 'web', document, window });
  return watchComeBack(back, { kind: 'app', appState: AppState });
}
