// Refreshing when the user comes back after leaving the browser tab, window or Android app.
// Pure (no imports) so tests/come-back.test.mjs can run it in Node.

export type ComeBackDocument = {
  visibilityState: string;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
};

export type ComeBackWindow = {
  addEventListener: (type: 'blur' | 'focus', listener: () => void) => void;
  removeEventListener: (type: 'blur' | 'focus', listener: () => void) => void;
};

export type ComeBackAppState = {
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

export type ComeBackSource =
  | { kind: 'web'; document: ComeBackDocument; window: ComeBackWindow }
  | { kind: 'app'; appState: ComeBackAppState };

/**
 * Calls `back` once each time the user comes back after leaving: the browser tab is shown again,
 * the browser or desktop-app window is focused after losing focus, or the Android app returns to
 * the front. Clicking into a window the user never left does nothing. Returns the unsubscribe.
 */
export function watchComeBack(back: () => void, source: ComeBackSource): () => void {
  let away = false;
  const leave = () => {
    away = true;
  };
  const arrive = () => {
    if (!away) return;
    away = false;
    back();
  };
  if (source.kind === 'web') {
    const { document: doc, window: win } = source;
    const onVisibility = () => (doc.visibilityState === 'hidden' ? leave() : arrive());
    doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('blur', leave);
    win.addEventListener('focus', arrive);
    return () => {
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('blur', leave);
      win.removeEventListener('focus', arrive);
    };
  }
  const subscription = source.appState.addEventListener('change', (state) => (state === 'active' ? arrive() : leave()));
  return () => subscription.remove();
}
