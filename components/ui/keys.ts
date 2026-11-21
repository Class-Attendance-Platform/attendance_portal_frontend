import { Platform } from 'react-native';

type KeyEvent = {
  key: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault: () => void;
};

const isSpace = (key: string) => key === ' ' || key === 'Spacebar';

const isPlain = (event: KeyEvent) => !event.altKey && !event.ctrlKey && !event.metaKey;

function arrowStep(key: string): number {
  if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
  return 0;
}

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
  index: number;
  count: number;
  onPick: () => void;
  onMove: (index: number) => void;
  tabStop?: boolean;
  disabled?: boolean;
};

export function radioKeys({ index, count, onPick, onMove, tabStop, disabled }: RadioKeysOptions): object {
  if (Platform.OS !== 'web') return {};
  return {
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
