import * as React from 'react';
import { Keyboard, Platform, type View } from 'react-native';

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
