import * as React from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH, typeScale } from '@/lib/theme';
import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type TextLinkProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  small?: boolean;
  className?: string;
};

function touchStyle(lineHeight: number): ViewStyle {
  return { minHeight: MIN_TOUCH, marginVertical: -(MIN_TOUCH - lineHeight) / 2 };
}

const TOUCH = { small: touchStyle(typeScale.small.lineHeight), body: touchStyle(typeScale.body.lineHeight) };

export const TextLink = React.forwardRef<View, TextLinkProps>(function TextLink({ label, small, className, ...props }, ref) {
  const [hovered, setHovered] = React.useState(false);
  const { style, ...rest } = props as typeof props & { style?: StyleProp<ViewStyle> };
  return (
    <Pressable
      ref={ref}
      role="link"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={cn('justify-center rounded-[4px]', FOCUS_RING, className)}
      style={[small ? TOUCH.small : TOUCH.body, style]}
      {...rest}
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
