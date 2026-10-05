import * as React from 'react';
import { Keyboard, Platform, type View } from 'react-native';

/**
 * How far the on-screen keyboard covers the view `ref` points at (0 when it doesn't, and always
 * 0 on the web). The Android app draws edge to edge, so the system no longer shrinks the window
 * for the keyboard (adjustResize): pages use this as bottom padding instead, which shrinks their
 * scroll view above the keyboard (Android then scrolls the focused field into view itself).
 * Measured in window coordinates, so top bars and tab bars around the view need no offsets.
 */
export function useKeyboardOverlap(ref: React.RefObject<View | null>): number {
  const [overlap, setOverlap] = React.useState(0);
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _width, height) => {
        setOverlap(Math.max(0, Math.round(y + height - keyboardTop)));
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ref]);
  return overlap;
}
