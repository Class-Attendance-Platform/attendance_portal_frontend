import { Platform } from 'react-native';

// Web keyboard for checkboxes and radio options. react-native-web turns Enter into a press, but
// Space only for buttons, and arrow keys do nothing. These add the standard keys: spread the result
// on the Pressable (React Native's types have no onKeyDown; phones get no props). react-native-web
// calls this onKeyDown after its own handler, which ignores these keys, so nothing runs twice.

type KeyEvent = {
  key: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault: () => void;
};

const isSpace = (key: string) => key === ' ' || key === 'Spacebar';

/** With Alt, Ctrl or Cmd the key belongs to the browser (Alt+Left is Back). */
const isPlain = (event: KeyEvent) => !event.altKey && !event.ctrlKey && !event.metaKey;

/** Right/down: the next option; left/up: the previous one; 0 for other keys. */
function arrowStep(key: string): number {
  if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
  return 0;
}

/** Space presses it too (a checkbox, or a radio option on its own), without scrolling the page. */
export function spaceKey(onSpace: () => void, disabled?: boolean): object {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyDown: (event: KeyEvent) => {
      if (!isSpace(event.key) || !isPlain(event)) return;
      event.preventDefault();
      if (!disabled && !event.repeat) onSpace();
    },
  };
}

export type RadioKeysOptions = {
  /** This option's place in the group. */
  index: number;
  count: number;
  /** Space: choose this option. */
  onPick: () => void;
  /** Arrow keys: the group moves to option `index` (wrapping around the ends). */
  onMove: (index: number) => void;
  /**
   * true/false: the group has one Tab stop (this option or not; the arrow keys reach the others).
   * Leave out to keep every option a Tab stop.
   */
  tabStop?: boolean;
  disabled?: boolean;
};

/** One option of a radio group: Space chooses it, the arrow keys move within the group. */
export function radioKeys({ index, count, onPick, onMove, tabStop, disabled }: RadioKeysOptions): object {
  if (Platform.OS !== 'web') return {};
  return {
    // Disabled options are left to react-native-web (not focusable).
    ...(tabStop === undefined || disabled ? {} : { tabIndex: tabStop ? 0 : -1 }),
    onKeyDown: (event: KeyEvent) => {
      if (disabled || !isPlain(event)) return;
      if (isSpace(event.key)) {
        event.preventDefault();
        if (!event.repeat) onPick();
        return;
      }
      const step = arrowStep(event.key);
      if (!step || count < 2) return;
      event.preventDefault();
      onMove((index + step + count) % count);
    },
  };
}
