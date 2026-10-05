import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type ListRowProps = {
  title: string;
  /** Second line, e.g. the student id. */
  subtitle?: string;
  /** Extra content under the subtitle (a progress bar, a warning). */
  children?: React.ReactNode;
  /** Right side: a pill, a percentage, a button. */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Read by screen readers when pressable (default: the title). */
  accessibilityLabel?: string;
  /** Shows a chevron when pressable (default true). */
  chevron?: boolean;
  /** Draw the divider above (all rows but the first in a list). */
  divider?: boolean;
  className?: string;
};

/** One row of a list (phones, or short lists anywhere). Put rows in a Card with `padded={false}`. */
export function ListRow({
  title,
  subtitle,
  children,
  right,
  onPress,
  accessibilityLabel,
  chevron = true,
  divider = false,
  className,
}: ListRowProps) {
  const body = (
    <>
      <View className="flex-1 gap-0.5">
        <Text weight="semibold">{title}</Text>
        {subtitle ? (
          <Text variant="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
        {children ? <View className="mt-1.5 gap-1.5">{children}</View> : null}
      </View>
      {right ? <View className="items-end">{right}</View> : null}
      {onPress && chevron ? <Icon as={ChevronRight} size={18} color="muted" /> : null}
    </>
  );
  const rowClass = cn('min-h-[56px] flex-row items-center gap-3 px-4 py-3', divider && 'border-t border-border', className);
  if (!onPress) return <View className={rowClass}>{body}</View>;
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className={cn(rowClass, 'active:bg-bg web:hover:bg-bg', FOCUS_RING)}
    >
      {body}
    </Pressable>
  );
}
