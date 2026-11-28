import { DefaultTheme, type Theme } from '@react-navigation/native';

export const colors = {
  bg: '#F5F7F5',
  surface: '#FFFFFF',
  border: '#DCE3DD',
  text: '#17201A',
  muted: '#525E55',
  primary: '#0A6B3B',
  primaryHover: '#08552F',
  primarySoft: '#E4F1E8',
  present: '#15803D',
  absent: '#B42318',
  absentSoft: '#FDECEA',
  warn: '#9A4A06',
  warnInk: '#7A3B05',
  warnSoft: '#FDF1E1',
  warnBorder: '#F2D3AE',
  info: '#0369A1',
  infoSoft: '#E0F2FE',
  track: '#E6EBE7',
  white: '#FFFFFF',
  scrim: 'rgba(23, 32, 26, 0.45)',
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#DCE3DD',
  sidebarText: '#17201A',
  sidebarMuted: '#525E55',
  sidebarActiveText: '#0A6B3B',
  btnPrimaryText: '#FFFFFF',
  btnSecondaryText: '#17201A',
  btnQuietText: '#0A6B3B',
  btnDangerText: '#FFFFFF',
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
