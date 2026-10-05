import { DefaultTheme, type Theme } from '@react-navigation/native';

/**
 * Campus Green design tokens (light only). The same colours are CSS variables in global.css and
 * Tailwind colours in tailwind.config.js (`bg-surface`, `text-muted`, `border-border`, ...).
 * Use these raw values where a class cannot reach: icon `color` props, ActivityIndicator,
 * StatusBar, the navigation theme. See docs/design-system.md.
 */
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
  /** Dims the page behind dialogs (no blur). */
  scrim: 'rgba(23, 32, 26, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;

/** Font sizes and line heights (px). Nothing under 12. */
export const typeScale = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 22 },
  section: { fontSize: 17, lineHeight: 24 },
  titlePhone: { fontSize: 20, lineHeight: 26 },
  title: { fontSize: 26, lineHeight: 32 },
  code: { fontSize: 40, lineHeight: 48 },
} as const;

/** Public Sans files loaded in app/_layout.tsx (one family name per weight: Android needs that). */
export const fonts = {
  regular: 'PublicSans_400Regular',
  medium: 'PublicSans_500Medium',
  semibold: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;

/** System font weights used until Public Sans has loaded (or if it fails to load). */
export const fallbackWeights: Record<FontWeightName, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const radius = { control: 8, card: 10, cardPhone: 12, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

/** Smallest touch target (px). */
export const MIN_TARGET = 44;

/** Width where the sidebar replaces the phone top bar and tab bar. */
export const DESKTOP_BREAKPOINT = 768;

/** Page content never gets wider than this. */
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
