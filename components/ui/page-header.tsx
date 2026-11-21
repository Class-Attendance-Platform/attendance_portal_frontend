import { Link, type Href } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { DocumentTitle } from './document-title';
import { Text } from './text';
import { TextLink } from './text-link';

export type Crumb = { label: string; href?: Href };

export type PageHeaderProps = {
  title: string;
  documentTitle?: string;
  breadcrumb?: Crumb[];
  meta?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, documentTitle, breadcrumb, meta, actions }: PageHeaderProps) {
  const { isDesktop } = useBreakpoint();
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-4">
      <DocumentTitle page={documentTitle ?? title} />
      <View className="min-w-[220px] flex-1 gap-1">
        {breadcrumb?.length ? (
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
                  <Link href={crumb.href} dismissTo asChild>
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
