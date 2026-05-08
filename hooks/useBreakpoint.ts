import { useWindowDimensions } from "react-native";

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    isMobile: width < 768,
    isDesktop: width >= 768,
  } as const;
}