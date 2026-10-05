import * as React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

export type PageProps = {
  children: React.ReactNode;
  /** false: no scroll view (the page manages its own scrolling). */
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  className?: string;
};

/**
 * The content area of a signed-in page: scrolls, max width 1200 px, padding 24/32 on desktop and
 * 16/20 on phones, 20 px between sections. Start it with a PageHeader.
 */
export function Page({ children, scroll = true, refreshControl, className }: PageProps) {
  const { isDesktop } = useBreakpoint();
  const content = cn('w-full max-w-page self-center', isDesktop ? 'gap-5 px-8 pb-8 pt-6' : 'gap-4 px-5 pb-6 pt-2', className);
  if (!scroll) return <View className={cn('flex-1', content)}>{children}</View>;
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName={content}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
