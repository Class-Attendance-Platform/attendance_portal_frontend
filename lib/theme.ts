import { DefaultTheme, type Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

const css = (name: string, fallback: string) => (Platform.OS === 'web' ? `rgb(var(--color-${name}))` : fallback);

export const colors = {
  bg: css('bg', '#F5F7F5'),
  surface: css('surface', '#FFFFFF'),
  border: css('border', '#DCE3DD'),
  text: css('font-main', '#17201A'),
  muted: css('font-muted', '#525E55'),
  primary: css('font-accent', '#0A6B3B'),
  primaryHover: css('primary-hover', '#08552F'),
  primarySoft: css('primary-soft', '#E4F1E8'),
  present: css('present', '#15803D'),
  absent: css('absent', '#B42318'),
  absentSoft: css('absent-soft', '#FDECEA'),
  warn: css('warn', '#9A4A06'),
  warnInk: css('warn-ink', '#7A3B05'),
  warnSoft: css('warn-soft', '#FDF1E1'),
  warnBorder: css('warn-border', '#F2D3AE'),
  info: css('info', '#0369A1'),
  infoSoft: css('info-soft', '#E0F2FE'),
  track: css('track', '#E6EBE7'),
  white: css('white', '#FFFFFF'),
  scrim: 'rgba(23, 32, 26, 0.45)',
  sidebarBg: css('sidebar-bg', '#FFFFFF'),
  sidebarBorder: css('sidebar-border', '#DCE3DD'),
  sidebarText: css('sidebar-text', '#17201A'),
  sidebarMuted: css('sidebar-muted', '#525E55'),
  sidebarActiveText: css('sidebar-btn-active-text', '#0A6B3B'),
  btnPrimaryText: css('btn-primary-text', '#FFFFFF'),
  btnSecondaryText: css('btn-secondary-text', '#17201A'),
  btnQuietText: css('btn-quiet-text', '#0A6B3B'),
  btnDangerText: css('btn-danger-text', '#FFFFFF'),
} as const;

export type ColorToken = keyof typeof colors;

export const typeScale = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 22 },
  section: { fontSize: 17, lineHeight: 24 },
  titlePhone: { fontSize: 20, lineHeight: 26 },
  title: { fontSize: 26, lineHeight: 32 },
  code: { fontSize: 40, lineHeight: 48 },
} as const;

export const fonts = {
  regular: 'PublicSans_400Regular',
  medium: 'PublicSans_500Medium',
  semibold: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;

export const fallbackWeights: Record<FontWeightName, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const radius = { control: 8, card: 10, cardPhone: 12, pill: 999 } as const;

export const MIN_TOUCH = 44;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const MIN_TARGET = 44;

export const DESKTOP_BREAKPOINT = 768;

export const WIDE_BREAKPOINT = 1100;

export const PAGE_MAX_WIDTH = 1200;

export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    border: colors.border,
    card: colors.surface,
    notification: colors.absent,
    primary: colors.primary,
    text: colors.text,
  },
};
