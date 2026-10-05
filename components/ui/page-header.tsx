import { Link, type Href } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { Text } from './text';
import { TextLink } from './text-link';

export type Crumb = { label: string; href?: Href };

export type PageHeaderProps = {
  title: string;
  /** Where this page sits, e.g. [{label: 'My courses', href: '/teacher'}, {label: 'CSE 301'}]. */
  breadcrumb?: Crumb[];
  /** One muted line under the title: "CSE 301 · Level 3 · Term I · 42 students". */
  meta?: string;
  /** Buttons on the right (they wrap under the title on phones). */
  actions?: React.ReactNode;
};

/** The top of every page: breadcrumb, title (26 px desktop, 20 px phone), meta line, actions. */
export function PageHeader({ title, breadcrumb, meta, actions }: PageHeaderProps) {
  const { isDesktop } = useBreakpoint();
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-4">
      <View className="min-w-[220px] flex-1 gap-1">
        {breadcrumb?.length ? (
          // The links' 44 px touch areas reach 13 px above and below the text: on top of the title
          // (zIndex), inside the page's top padding (6 px more on phones) and apart when they wrap.
          <View
            role="navigation"
            accessibilityLabel="Breadcrumb"
            className={cn('flex-row flex-wrap items-center gap-x-1.5 gap-y-7', !isDesktop && 'pt-1.5')}
            style={{ zIndex: 1 }}
          >
            {breadcrumb.map((crumb, index) => (
              <View key={`${crumb.label}-${index}`} className="flex-row items-center gap-1.5">
                {index > 0 ? (
                  <Text variant="small" tone="muted" aria-hidden>
                    /
                  </Text>
                ) : null}
                {crumb.href ? (
                  <Link href={crumb.href} asChild>
                    <TextLink label={crumb.label} small />
                  </Link>
                ) : (
                  <Text variant="small" tone="muted">
                    {crumb.label}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="title" className={isDesktop ? 'mt-1' : undefined}>
          {title}
        </Text>
        {meta ? <Text tone="muted">{meta}</Text> : null}
      </View>
      {actions ? <View className="flex-row flex-wrap items-center gap-2">{actions}</View> : null}
    </View>
  );
}
