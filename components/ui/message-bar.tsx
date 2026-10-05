import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, type ColorToken } from '@/lib/theme';
import { FOCUS_RING, cn } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type MessageType = 'success' | 'error' | 'info';

export type Message = {
  type: MessageType;
  text: string;
  title?: string;
};

type MessageApi = {
  show: (message: Message) => void;
  success: (text: string, title?: string) => void;
  error: (text: string, title?: string) => void;
  info: (text: string, title?: string) => void;
  hide: () => void;
};

const MessageContext = React.createContext<MessageApi | null>(null);

/** A message stays until it is closed or for this long. */
const VISIBLE_MS = 5000;

const STYLES: Record<MessageType, { icon: LucideIcon; tint: ColorToken; bg: string; border: string }> = {
  success: { icon: CircleCheck, tint: 'primary', bg: 'bg-primary-soft', border: 'border-primary' },
  error: { icon: CircleAlert, tint: 'absent', bg: 'bg-absent-soft', border: 'border-absent' },
  info: { icon: Info, tint: 'info', bg: 'bg-info-soft', border: 'border-info' },
};

/**
 * Shows short messages at the top of the screen ("Saved.", "Could not save: ..."). One at a
 * time: a new message replaces the old one. Use `useMessage()`.
 */
export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState<(Message & { id: number }) | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = React.useRef(0);
  const insets = useSafeAreaInsets();

  const hide = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMessage(null);
  }, []);

  const show = React.useCallback(
    (next: Message) => {
      if (timer.current) clearTimeout(timer.current);
      counter.current += 1;
      setMessage({ ...next, id: counter.current });
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [hide]
  );

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = React.useMemo<MessageApi>(
    () => ({
      show,
      success: (text, title) => show({ type: 'success', text, title }),
      error: (text, title) => show({ type: 'error', text, title }),
      info: (text, title) => show({ type: 'info', text, title }),
      hide,
    }),
    [show, hide]
  );

  const style = message ? STYLES[message.type] : null;

  return (
    <MessageContext.Provider value={api}>
      {children}
      {message && style ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16, zIndex: 1000 }}
        >
          <View
            key={message.id}
            role={message.type === 'error' ? 'alert' : 'status'}
            accessibilityLiveRegion={message.type === 'error' ? 'assertive' : 'polite'}
            aria-live={Platform.OS === 'web' ? (message.type === 'error' ? 'assertive' : 'polite') : undefined}
            className={cn('w-full max-w-[560px] flex-row items-start gap-3 rounded-control border py-2 pl-4 pr-1', style.bg, style.border)}
          >
            <View className="pt-2.5">
              <Icon as={style.icon} size={20} color={style.tint} />
            </View>
            <View className="flex-1 gap-0.5 py-2">
              {message.title ? <Text weight="semibold">{message.title}</Text> : null}
              <Text>{message.text}</Text>
            </View>
            <Pressable
              role="button"
              accessibilityLabel="Close message"
              onPress={hide}
              hitSlop={4}
              className={cn('h-11 w-11 items-center justify-center rounded-control', FOCUS_RING)}
            >
              <Icon as={X} size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </MessageContext.Provider>
  );
}

/** `message.success('Saved.')`, `message.error(error.message)`, `message.info(...)`. */
export function useMessage() {
  const api = React.useContext(MessageContext);
  if (!api) throw new Error('useMessage must be used within a MessageProvider');
  return api;
}
