import * as React from 'react';
import { View, type ViewProps } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { Text } from './text';

export type CardProps = ViewProps & {
  title?: string;
  titleNote?: string;
  actions?: React.ReactNode;
  padded?: boolean;
  className?: string;
};

export function Card({ title, titleNote, actions, padded = true, className, children, ...props }: CardProps) {
  const { isDesktop } = useBreakpoint();
  return (
    <View
      className={cn(
        'border border-border bg-surface',
        isDesktop ? 'rounded-card' : 'rounded-card-phone',
        padded && (isDesktop ? 'p-5' : 'p-4'),
        className
      )}
      {...props}
    >
      {title || actions ? (
        <View className={cn('flex-row flex-wrap items-center justify-between gap-3', !padded && (isDesktop ? 'px-5 pt-5' : 'px-4 pt-4'))}>
          {title ? (
            <View className="flex-shrink flex-row flex-wrap items-baseline gap-1.5">
              <Text variant="section">{title}</Text>
              {titleNote ? <Text tone="muted">{titleNote}</Text> : null}
            </View>
          ) : (
            <View />
          )}
          {actions ? <View className="flex-row flex-wrap items-center gap-2">{actions}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
