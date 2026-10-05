import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

import type { ColorToken } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type NoticeTone = 'info' | 'warn' | 'error' | 'success';

const TONES: Record<NoticeTone, { icon: LucideIcon; tint: ColorToken; ink: 'default' | 'warnInk'; box: string }> = {
  info: { icon: Info, tint: 'info', ink: 'default', box: 'bg-info-soft border-info-soft' },
  warn: { icon: TriangleAlert, tint: 'warn', ink: 'warnInk', box: 'bg-warn-soft border-warn-border' },
  error: { icon: CircleAlert, tint: 'absent', ink: 'default', box: 'bg-absent-soft border-absent-soft' },
  success: { icon: CircleCheck, tint: 'primary', ink: 'default', box: 'bg-primary-soft border-primary-soft' },
};

export type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  message: string;
  /** Buttons or links under the message. */
  children?: React.ReactNode;
  /** Announce it when it appears (form errors). */
  live?: boolean;
  className?: string;
};

/** An inline panel inside a page or form: info, warning, error or success, always with words. */
export function Notice({ tone = 'info', title, message, children, live, className }: NoticeProps) {
  const style = TONES[tone];
  return (
    <View
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
      accessibilityLiveRegion={live ? 'polite' : undefined}
      aria-live={live && Platform.OS === 'web' ? 'polite' : undefined}
      className={cn('flex-row items-start gap-3 rounded-control border p-3', style.box, className)}
    >
      <View className="pt-0.5">
        <Icon as={style.icon} size={20} color={style.tint} />
      </View>
      <View className="flex-1 gap-1">
        {title ? (
          <Text weight="semibold" tone={style.ink}>
            {title}
          </Text>
        ) : null}
        <Text tone={style.ink}>{message}</Text>
        {children ? <View className="mt-1 flex-row flex-wrap gap-2">{children}</View> : null}
      </View>
    </View>
  );
}
