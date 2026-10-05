import { useWindowDimensions } from 'react-native';

import { DESKTOP_BREAKPOINT } from '@/lib/theme';

/** Phone layout below 768 px (top bar + tab bar), desktop/tablet layout from 768 px (sidebar). */
export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    width,
    isMobile: width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
  } as const;
}
