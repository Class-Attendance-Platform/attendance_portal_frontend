import * as React from 'react';
import { View } from 'react-native';

import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Text } from './text';

export type AvatarProps = {
  name: string;
  size?: number;
  className?: string;
};

export function Avatar({ name, size = 44, className }: AvatarProps) {
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      className={cn('items-center justify-center rounded-pill border border-border bg-primary-soft', className)}
      style={{ width: size, height: size }}
    >
      <Text weight="bold" tone="primary" style={{ fontSize: Math.max(12, Math.round(size * 0.34)), lineHeight: Math.round(size * 0.5) }}>
        {initials(name)}
      </Text>
    </View>
  );
}
