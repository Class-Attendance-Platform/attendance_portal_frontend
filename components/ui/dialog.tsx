import { X } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { IconButton } from './button';
import { DialogMessageBar } from './message-bar';
import { Text } from './text';

export type DialogProps = {
  open: boolean;
  /** Called by the close button, the backdrop, Android back and Escape on the web. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Buttons along the bottom (main action last). */
  actions?: React.ReactNode;
  /** false: only the action buttons close it (backdrop, back and Escape do nothing). */
  dismissable?: boolean;
  /** Max width: sm 400, md 560 (default), lg 720. */
  size?: 'sm' | 'md' | 'lg';
};

const WIDTHS = { sm: 400, md: 560, lg: 720 } as const;

/** A centred dialog. No animation: it appears and disappears at once. */
export function Dialog({ open, onClose, title, description, children, actions, dismissable = true, size = 'md' }: DialogProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = dismissable ? onClose : () => {};
  // Phones: the panel stays above the on-screen keyboard and scrolls inside (see useKeyboardOverlap).
  const frame = React.useRef<View>(null);
  const keyboard = useKeyboardOverlap(frame);
  const bottom = keyboard ? keyboard + 16 : insets.bottom + 16;

  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View
        ref={frame}
        style={{
          flex: 1,
          backgroundColor: colors.scrim,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top + 16,
          paddingBottom: bottom,
          paddingHorizontal: 16,
        }}
      >
        {/* The backdrop: a separate layer so presses inside the panel never reach it. */}
        <Pressable
          accessible={false}
          onPress={close}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          className="w-full rounded-card-phone border border-border bg-surface"
          style={{ maxWidth: WIDTHS[size], maxHeight: Math.max(160, height - insets.top - 16 - bottom) }}
        >
          <View className="flex-row items-start gap-2 pl-5 pr-2 pt-3">
            <View className="flex-1 gap-1 pt-2">
              <Text variant="section">{title}</Text>
              {description ? <Text tone="muted">{description}</Text> : null}
            </View>
            {dismissable ? <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} /> : null}
          </View>
          {children ? (
            <ScrollView
              className="flex-grow-0"
              overScrollMode="never"
              bounces={false}
              contentContainerClassName={cn('px-5 pt-4', !actions && 'pb-5')}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : null}
          {actions ? <View className="flex-row flex-wrap justify-end gap-2 px-5 pb-5 pt-5">{actions}</View> : null}
          {!actions && !children ? <View className="h-4" /> : null}
        </View>
        {/* Messages sent while the dialog is open show here, above the backdrop and the panel. */}
        <DialogMessageBar open={open} />
      </View>
    </Modal>
  );
}
