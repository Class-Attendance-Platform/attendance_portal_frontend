import { CircleAlert } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Icon } from './icon';
import { Text } from './text';

export type FieldFrameProps = {
  label: string;
  hideLabel?: boolean;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  onLabelPress?: () => void;
  nativeID?: string;
  messageId?: string;
  children: React.ReactNode;
  className?: string;
};

export function FieldFrame({
  label,
  hideLabel,
  hint,
  error,
  required,
  onLabelPress,
  nativeID,
  messageId,
  children,
  className,
}: FieldFrameProps) {
  return (
    <View className={className ?? 'gap-1.5'}>
      {hideLabel ? null : (
        <Pressable onPress={onLabelPress} accessible={false} tabIndex={-1} className="self-start">
          <Text variant="label" nativeID={nativeID}>
            {label}
            {required ? <Text tone="muted"> (required)</Text> : null}
          </Text>
        </Pressable>
      )}
      {children}
      <FieldMessage hint={hint} error={error} nativeID={messageId} />
    </View>
  );
}

export function describedBy(messageId: string, hasMessage: boolean): object {
  return Platform.OS === 'web' && hasMessage ? { 'aria-describedby': messageId } : {};
}

export function FieldMessage({ hint, error, nativeID }: { hint?: string | null; error?: string | null; nativeID?: string }) {
  if (error) {
    return (
      <View
        nativeID={nativeID}
        className="flex-row items-start gap-1.5"
        role="alert"
        accessibilityLiveRegion="polite"
        aria-live={Platform.OS === 'web' ? 'polite' : undefined}
      >
        <View className="pt-0.5">
          <Icon as={CircleAlert} size={16} color="absent" />
        </View>
        <Text variant="small" tone="absent" className="flex-1">
          {error}
        </Text>
      </View>
    );
  }
  if (hint) {
    return (
      <Text variant="small" tone="muted" nativeID={nativeID}>
        {hint}
      </Text>
    );
  }
  return null;
}

export function controlBoxClass({ focused, error, disabled }: { focused?: boolean; error?: boolean; disabled?: boolean }) {
  return [
    'min-h-[44px] flex-row items-center rounded-control bg-surface',
    error ? 'border-absent' : focused ? 'border-primary' : 'border-border',
    focused || error ? 'border-2 px-[11px]' : 'border px-3',
    disabled ? 'opacity-60' : '',
  ].join(' ');
}
