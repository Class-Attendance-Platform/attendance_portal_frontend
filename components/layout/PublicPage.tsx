import { Link, type Href } from 'expo-router';
import * as React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentTitle } from '@/components/ui/document-title';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap';
import { cn } from '@/lib/utils';

const LOGO = require('@/assets/images/hstu.png');

export type PublicPageProps = {
  children: React.ReactNode;
  title?: string;
  width?: 'narrow' | 'wide';
  footerLinks?: { label: string; href: Href }[];
};

export function PublicPage({ children, title, width = 'narrow', footerLinks }: PublicPageProps) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const frame = React.useRef<View>(null);
  const keyboard = useKeyboardOverlap(frame);
  return (
    <View ref={frame} className="flex-1 bg-bg" style={keyboard ? { paddingBottom: keyboard } : undefined}>
      <DocumentTitle page={title} />
      <ScrollView
        className="flex-1"
        overScrollMode="never"
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + (isDesktop ? 48 : 24),
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        }}
      >
        <View role="main" className={cn('w-full self-center gap-6', width === 'wide' ? 'max-w-[720px]' : 'max-w-[420px]')}>
          <View className="items-center gap-3">
            <Image
              source={LOGO}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
              accessibilityLabel="Hajee Mohammad Danesh Science and Technology University logo"
            />
            <View className="items-center gap-0.5">
              <Text variant="section" weight="bold" align="center" role="none">
                HSTU Attendance Portal
              </Text>
              <Text variant="small" tone="muted" align="center">
                Department of Computer Science and Engineering
              </Text>
            </View>
          </View>
          {children}
          {footerLinks?.length ? (
            <View className="flex-row flex-wrap items-center justify-center gap-x-5 gap-y-7">
              {footerLinks.map((link) => (
                <Link key={link.label} href={link.href} asChild>
                  <TextLink label={link.label} small />
                </Link>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
