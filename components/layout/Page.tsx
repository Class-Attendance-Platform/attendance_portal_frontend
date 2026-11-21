import * as React from 'react';
import { Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export type PageProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  onRefresh?: () => Promise<unknown>;
  className?: string;
  scrollRef?: React.Ref<ScrollView>;
};

export function Page({ children, scroll = true, refreshControl, onRefresh, className, scrollRef }: PageProps) {
  const { isDesktop } = useBreakpoint();
  const frame = React.useRef<View>(null);
  const keyboard = useKeyboardOverlap(frame);
  const [refreshing, setRefreshing] = React.useState(false);
  const pull = React.useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  const content = cn('w-full max-w-page self-center', isDesktop ? 'gap-5 px-8 pb-8 pt-6' : 'gap-4 px-5 pb-6 pt-2', className);
  if (!scroll) return <View className={cn('flex-1', content)}>{children}</View>;
  const control =
    refreshControl ??
    (onRefresh && Platform.OS !== 'web' ? (
      <RefreshControl refreshing={refreshing} onRefresh={pull} colors={[colors.primary]} tintColor={colors.primary} />
    ) : undefined);
  return (
    <View ref={frame} className="flex-1" style={keyboard ? { paddingBottom: keyboard } : undefined}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        overScrollMode="never"
        bounces={false}
        contentContainerClassName={content}
        keyboardShouldPersistTaps="handled"
        refreshControl={control}
      >
        {children}
      </ScrollView>
    </View>
  );
}
