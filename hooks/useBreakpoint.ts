import { useWindowDimensions } from 'react-native';

import { DESKTOP_BREAKPOINT, WIDE_BREAKPOINT } from '@/lib/theme';

/**
 * Phone layout below 768 px (top bar + tab bar), desktop/tablet layout from 768 px (sidebar).
 * `isWide` (from 1100 px): room for the admin tables next to the sidebar.
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    width,
    isMobile: width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    isWide: width >= WIDE_BREAKPOINT,
  } as const;
}
