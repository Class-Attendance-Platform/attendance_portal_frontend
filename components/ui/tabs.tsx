import { Link, usePathname, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type TabItem = { key: string; label: string };

export type TabsProps = {
  tabs: TabItem[];
  value: string;
  param?: string;
  label: string;
  dense?: boolean;
};

export function useTab(tabs: TabItem[], param = 'tab'): string {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const raw = params[param];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return tabs.some((tab) => tab.key === value) ? (value as string) : tabs[0]?.key;
}

export function Tabs({ tabs, value, param = 'tab', label, dense }: TabsProps) {
  const pathname = usePathname();
  return (
    <View className="border-b border-border">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} overScrollMode="never" bounces={false} role="tablist" accessibilityLabel={label}>
        <View className={cn('flex-row', dense ? 'gap-0' : 'gap-1')}>
          {tabs.map((tab, index) => {
            const active = tab.key === value;
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
