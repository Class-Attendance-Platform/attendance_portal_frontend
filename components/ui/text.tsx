import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, fallbackWeights, fonts, typeScale, type ColorToken, type FontWeightName } from '@/lib/theme';

const FontsReadyContext = React.createContext(false);
export const FontsReadyProvider = FontsReadyContext.Provider;
export const useFontsReady = () => React.useContext(FontsReadyContext);

export function useFontStyle(weight: FontWeightName = 'regular'): TextStyle {
  const ready = useFontsReady();
  return ready ? { fontFamily: fonts[weight], fontWeight: 'normal' } : { fontWeight: fallbackWeights[weight] };
}

export type TextVariant = 'body' | 'small' | 'caption' | 'label' | 'section' | 'title' | 'stat' | 'code';

export type TextTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'present'
  | 'absent'
  | 'warn'
  | 'warnInk'
  | 'info'
  | 'inverse';

const TONES: Record<TextTone, ColorToken> = {
  default: 'text',
  muted: 'muted',
  primary: 'primary',
  present: 'present',
  absent: 'absent',
  warn: 'warn',
  warnInk: 'warnInk',
  info: 'info',
  inverse: 'white',
};

const DEFAULT_WEIGHT: Record<TextVariant, FontWeightName> = {
  body: 'regular',
  small: 'regular',
  caption: 'regular',
  label: 'medium',
  section: 'semibold',
  title: 'bold',
  stat: 'bold',
  code: 'bold',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  weight?: FontWeightName;
  tone?: TextTone;
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
};

export function Text({
  variant = 'body',
  weight,
  tone = 'default',
  tabular,
  align,
  style,
  role,
  ...props
}: TextProps) {
  const { isDesktop } = useBreakpoint();
  const font = useFontStyle(weight ?? DEFAULT_WEIGHT[variant]);
  const size =
    variant === 'title'
      ? isDesktop
        ? typeScale.title
        : typeScale.titlePhone
      : variant === 'stat'
        ? typeScale.title
        : variant === 'label'
          ? typeScale.body
          : typeScale[variant];

  const base: TextStyle = {
    ...size,
    ...font,
    color: colors[TONES[tone]],
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
    ...(variant === 'code' ? { letterSpacing: 4 } : null),
    ...(align ? { textAlign: align } : null),
  };

  const headingRole = variant === 'title' || variant === 'section' ? 'heading' : undefined;

  return (
    <RNText
      role={role ?? headingRole}
      aria-level={headingRole && !role ? (variant === 'title' ? 1 : 2) : undefined}
      style={[base, style]}
      {...props}
    />
  );
}
