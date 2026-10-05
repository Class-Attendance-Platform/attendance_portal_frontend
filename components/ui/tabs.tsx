import { Link, usePathname, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type TabItem = { key: string; label: string };

export type TabsProps = {
  tabs: TabItem[];
  /** The active tab key (read it from the URL with `useTab`). */
  value: string;
  /** The query parameter (default "tab"). */
  param?: string;
  /** Read by screen readers, e.g. "Course sections". */
  label: string;
  /** Less space around each label, so four tabs fit on a phone (390 px) without scrolling. */
  dense?: boolean;
};

/** The active tab from `?tab=` (or the first tab when missing or unknown). */
export function useTab(tabs: TabItem[], param = 'tab'): string {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const raw = params[param];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return tabs.some((tab) => tab.key === value) ? (value as string) : tabs[0]?.key;
}

/**
 * Tabs inside a page. Each tab is a link that changes `?tab=` in the URL, so reload and back
 * work. Other query parameters are dropped.
 */
export function Tabs({ tabs, value, param = 'tab', label, dense }: TabsProps) {
  const pathname = usePathname();
  return (
    <View className="border-b border-border">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} overScrollMode="never" bounces={false} role="tablist" accessibilityLabel={label}>
        <View className={cn('flex-row', dense ? 'gap-0' : 'gap-1')}>
          {tabs.map((tab, index) => {
            const active = tab.key === value;
            // The first tab is the default: its link has no `?tab=`.
            const href = (index === 0 ? pathname : `${pathname}?${param}=${encodeURIComponent(tab.key)}`) as Href;
            return (
              <Link key={tab.key} href={href} asChild>
                <Pressable
                  role="tab"
                  aria-selected={active}
                  accessibilityState={{ selected: active }}
                  className={cn(
                    '-mb-px min-h-[44px] justify-center border-b-2',
                    dense ? 'px-2' : 'px-3.5',
                    active ? 'border-primary' : 'border-transparent web:hover:border-border',
                    FOCUS_RING
                  )}
                >
                  <Text weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'muted'}>
                    {tab.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
