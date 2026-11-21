import { useWindowDimensions } from 'react-native';

import { DESKTOP_BREAKPOINT, WIDE_BREAKPOINT } from '@/lib/theme';

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    width,
    isMobile: width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    isWide: width >= WIDE_BREAKPOINT,
  } as const;
}
