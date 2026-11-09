import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';

import { colors, type ColorToken } from '@/lib/theme';

export type IconProps = {
  /** A lucide-react-native icon, e.g. `as={BookOpen}`. */
  as: LucideIcon;
  /** px (default 20). */
  size?: number;
  /** A token name (`primary`, `muted`, ...) or a raw colour. Default `text`. */
  color?: ColorToken | (string & {});
  strokeWidth?: number;
};

/**
 * A lucide icon with explicit `color` and `size` props (class names do not colour icons on
 * Android). Icons are decorative: put the words next to them or on the button's label.
 */
export function Icon({ as: Glyph, size = 20, color = 'text', strokeWidth = 2 }: IconProps) {
  const resolved = color in colors ? colors[color as ColorToken] : color;
  return <Glyph size={size} color={resolved} strokeWidth={strokeWidth} aria-hidden />;
}
