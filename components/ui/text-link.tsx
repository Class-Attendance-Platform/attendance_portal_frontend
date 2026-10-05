import * as React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type TextLinkProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** 13 px instead of 15 px (breadcrumbs, footers). */
  small?: boolean;
  className?: string;
};

/**
 * Green link text. Wrap it in expo-router's `<Link href asChild>` to navigate (a real link on
 * the web), or give it `onPress`. The touch area is at least 44 px tall.
 */
export const TextLink = React.forwardRef<View, TextLinkProps>(function TextLink({ label, small, className, ...props }, ref) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Pressable
      ref={ref}
      role="link"
      hitSlop={{ top: 12, bottom: 12 }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={cn('justify-center rounded-[4px]', FOCUS_RING, className)}
      {...props}
    >
      <Text
        variant={small ? 'small' : 'body'}
        weight="semibold"
        tone="primary"
        style={hovered ? { textDecorationLine: 'underline' } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
});
