import * as React from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH, typeScale } from '@/lib/theme';
import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type TextLinkProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** 13 px instead of 15 px (breadcrumbs, footers). */
  small?: boolean;
  className?: string;
};

/**
 * The link box is 44 px tall (the touch target) with the text centred in it. Negative vertical
 * margins give the extra height back, so the link takes only its text's line in the layout.
 * (hitSlop is not used: react-native-web ignores it, and on Android it cannot reach past the parent.)
 * Keep at least (44 - line height) / 2 px free above and below a link (13 px small, 11 px body),
 * or the touch area covers its neighbours.
 */
function touchStyle(lineHeight: number): ViewStyle {
  return { minHeight: MIN_TOUCH, marginVertical: -(MIN_TOUCH - lineHeight) / 2 };
}

const TOUCH = { small: touchStyle(typeScale.small.lineHeight), body: touchStyle(typeScale.body.lineHeight) };

/**
 * Green link text. Wrap it in expo-router's `<Link href asChild>` to navigate (a real link on
 * the web), or give it `onPress`. The touch area is 44 px tall.
 */
export const TextLink = React.forwardRef<View, TextLinkProps>(function TextLink({ label, small, className, ...props }, ref) {
  const [hovered, setHovered] = React.useState(false);
  // `<Link asChild>` passes a style down; keep it, after the touch box.
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
