import { CircleAlert, Inbox, RefreshCw, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './button';
import { Icon } from './icon';
import { Text } from './text';

export type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: LucideIcon;
  /** A button, e.g. { label: 'Add a course', onPress }. */
  action?: Pick<ButtonProps, 'label' | 'onPress' | 'icon' | 'variant'>;
  className?: string;
};

/** Nothing to show yet: says why and what to do. */
export function EmptyState({ title, message, icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <View className={cn('items-center gap-3 px-4 py-8', className)}>
      <View className="h-12 w-12 items-center justify-center rounded-pill bg-primary-soft">
        <Icon as={icon} size={24} color="primary" />
      </View>
      <View className="max-w-[480px] items-center gap-1">
        <Text variant="section" align="center">
          {title}
        </Text>
        {message ? (
          <Text tone="muted" align="center">
            {message}
          </Text>
        ) : null}
      </View>
      {action ? <Button variant={action.variant ?? 'primary'} {...action} className="mt-1 self-center" /> : null}
    </View>
  );
}

export type ErrorStateProps = {
  title?: string;
  /** Usually `error.message` from the API (already readable). */
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/** Loading failed: the reason and a "Try again" button. */
export function ErrorState({ title = "Couldn't load this", message, onRetry, retrying, className }: ErrorStateProps) {
  return (
    <View role="alert" className={cn('items-center gap-3 px-4 py-8', className)}>
      <View className="h-12 w-12 items-center justify-center rounded-pill bg-absent-soft">
        <Icon as={CircleAlert} size={24} color="absent" />
      </View>
      <View className="max-w-[480px] items-center gap-1">
        <Text variant="section" align="center">
          {title}
        </Text>
        <Text tone="muted" align="center">
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button label="Try again" icon={RefreshCw} onPress={onRetry} loading={retrying} className="mt-1 self-center" />
      ) : null}
    </View>
  );
}

export type LoadingStateProps = {
  /** Default "Loading…". */
  label?: string;
  /** Fill the screen (while the app starts). */
  fullScreen?: boolean;
  className?: string;
};

/** A plain spinner with words. */
export function LoadingState({ label = 'Loading…', fullScreen, className }: LoadingStateProps) {
  return (
    <View
      role="status"
      accessibilityLabel={label}
      className={cn('items-center justify-center gap-3 px-4 py-8', fullScreen && 'flex-1 bg-bg', className)}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text tone="muted">{label}</Text>
    </View>
  );
}
