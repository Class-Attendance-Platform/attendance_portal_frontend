import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';

import { colors, type ColorToken } from '@/lib/theme';

export type IconProps = {
  as: LucideIcon;
  size?: number;
  color?: ColorToken | (string & {});
  strokeWidth?: number;
};

export function Icon({ as: Glyph, size = 20, color = 'text', strokeWidth = 2 }: IconProps) {
  const resolved = color in colors ? colors[color as ColorToken] : color;
  return <Glyph size={size} color={resolved} strokeWidth={strokeWidth} aria-hidden />;
}
