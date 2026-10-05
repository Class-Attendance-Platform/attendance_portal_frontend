import { Link, type Href } from 'expo-router';
import * as React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap';
import { cn } from '@/lib/utils';

const LOGO = require('@/assets/images/hstu.png');

export type PublicPageProps = {
  children: React.ReactNode;
  /** Content width: narrow 420 (forms, default) or wide 720 (reading). */
  width?: 'narrow' | 'wide';
  /** Links under the content, e.g. [{label: 'About', href: '/about'}]. */
  footerLinks?: { label: string; href: Href }[];
};

/** Pages without the signed-in shell (sign-in, about): logo and name on top, a centred column. */
export function PublicPage({ children, width = 'narrow', footerLinks }: PublicPageProps) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  // Phones: room for the on-screen keyboard (see useKeyboardOverlap).
  const frame = React.useRef<View>(null);
  const keyboard = useKeyboardOverlap(frame);
  return (
    <View ref={frame} className="flex-1 bg-bg" style={keyboard ? { paddingBottom: keyboard } : undefined}>
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
            // Rows 28 px apart when they wrap, so the links' 44 px touch areas do not overlap.
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
