import { Link, usePathname, useRouter, type Href } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { User } from '@/lib/api/types';
import { fullName, roleLabel } from '@/lib/format';
import { homeFor } from '@/lib/routes';
import { cn, FOCUS_RING } from '@/lib/utils';
import { activeItem, isActive, NAV, type NavItem } from './nav';

const LOGO = require('@/assets/images/hstu.png');

/** Pages shown without the shell (full screen for a projector). */
const BARE_ROUTES = [/^\/teacher\/live\//];

/**
 * The signed-in frame. ≥ 768 px: sidebar (logo, role nav, the user at the bottom).
 * Phones: top bar (logo and name, account button; the page title is the PageHeader right under
 * it, as in mockup A) and a bottom tab bar, inside the safe area.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { isDesktop } = useBreakpoint();

  if (!user || BARE_ROUTES.some((pattern) => pattern.test(pathname))) {
    return <View className="flex-1 bg-bg">{children}</View>;
  }

  const items = NAV[user.role];
  return isDesktop ? (
    <View className="flex-1 flex-row bg-bg">
      <Sidebar user={user} items={items} pathname={pathname} />
      <View className="flex-1" role="main">
        {children}
      </View>
    </View>
  ) : (
    <View className="flex-1 bg-bg">
      <TopBar user={user} />
      <View className="flex-1" role="main">
        {children}
      </View>
      <TabBar items={items} pathname={pathname} />
    </View>
  );
}

function userLine(user: User) {
  return `${roleLabel(user.role)} · CSE`;
}

function Brand({ size, home }: { size: number; home: Href }) {
  return (
    <Link href={home} asChild>
      <Pressable
        role="link"
        accessibilityLabel="HSTU Attendance Portal, home"
        className={cn('min-h-[44px] flex-row items-center gap-2.5 rounded-control', FOCUS_RING)}
      >
        <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View>
          <Text weight="bold">HSTU Attendance</Text>
          <Text variant="caption" tone="muted">
            Portal
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function Sidebar({ user, items, pathname }: { user: User; items: NavItem[]; pathname: string }) {
  const insets = useSafeAreaInsets();
  const current = activeItem(items, pathname);
  return (
    <View
      role="navigation"
      accessibilityLabel="Main"
      className="w-[248px] border-r border-border bg-surface"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16, paddingLeft: insets.left + 14, paddingRight: 14 }}
    >
      <View className="px-2">
        <Brand size={36} home={homeFor(user.role)} />
      </View>
      <View className="mt-5 flex-1 gap-1">
        {items.map((item) => {
          const active = item === current;
          return (
            <Link key={item.href} href={item.href as Href} asChild>
              <Pressable
                role="link"
                aria-current={active ? 'page' : undefined}
                accessibilityState={{ selected: active }}
                className={cn(
                  'min-h-[44px] flex-row items-center gap-2.5 rounded-control px-3 py-2.5',
                  active ? 'bg-primary-soft' : 'active:bg-bg web:hover:bg-bg',
                  FOCUS_RING
                )}
              >
                <Icon as={item.icon} size={20} color={active ? 'primary' : 'text'} />
                <Text weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'default'}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <View className="mt-4 border-t border-border pt-3">
        <Link href="/account" asChild>
          <Pressable
            role="link"
            accessibilityLabel={`Account: ${fullName(user)}, ${userLine(user)}`}
            className={cn('min-h-[44px] flex-row items-center gap-3 rounded-control px-2 py-1.5 active:bg-bg web:hover:bg-bg', FOCUS_RING)}
          >
            <Avatar name={fullName(user)} size={36} />
            <View className="flex-1">
              <Text weight="semibold" numberOfLines={1}>
                {fullName(user)}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {userLine(user)}
              </Text>
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function TopBar({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between gap-3 bg-bg"
      style={{ paddingTop: insets.top + 8, paddingBottom: 4, paddingLeft: insets.left + 20, paddingRight: insets.right + 16 }}
    >
      <Link href={homeFor(user.role)} asChild>
        <Pressable
          role="link"
          accessibilityLabel="HSTU Attendance Portal, home"
          className={cn('min-h-[44px] flex-shrink flex-row items-center gap-2 rounded-control', FOCUS_RING)}
        >
          <Image source={LOGO} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text weight="bold" numberOfLines={1}>
            HSTU Attendance
          </Text>
        </Pressable>
      </Link>
      <Link href="/account" asChild>
        <Pressable
          role="link"
          accessibilityLabel="Account"
          className={cn('h-11 w-11 items-center justify-center rounded-pill', FOCUS_RING)}
        >
          <Avatar name={fullName(user)} size={44} className="bg-surface" />
        </Pressable>
      </Link>
    </View>
  );
}

function TabBar({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const tabs = items.filter((item) => item.tab);
  const more = items.filter((item) => !item.tab && !item.phoneHidden);
  const moreActive = more.some((item) => isActive(item, pathname)) && !tabs.some((item) => isActive(item, pathname));
  const current = activeItem(tabs, pathname);

  return (
    <View
      role="navigation"
      accessibilityLabel="Main"
      className="flex-row border-t border-border bg-surface px-1 pt-1.5"
      style={{ paddingBottom: Math.max(insets.bottom, 8), paddingLeft: insets.left + 4, paddingRight: insets.right + 4 }}
    >
      {tabs.map((item) => {
        const active = item === current;
        return (
          <Link key={item.href} href={item.href as Href} asChild>
            <Pressable
              role="link"
              aria-current={active ? 'page' : undefined}
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className={cn('min-h-[48px] flex-1 items-center justify-center gap-0.5 rounded-control py-1', FOCUS_RING)}
            >
              <Icon as={item.icon} size={22} color={active ? 'primary' : 'muted'} />
              <Text variant="caption" weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'muted'} numberOfLines={1}>
                {item.shortLabel ?? item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
      {more.length ? (
        <>
          <Pressable
            role="button"
            accessibilityLabel="More pages"
            accessibilityState={{ selected: moreActive, expanded: moreOpen }}
            onPress={() => setMoreOpen(true)}
            className={cn('min-h-[48px] flex-1 items-center justify-center gap-0.5 rounded-control py-1', FOCUS_RING)}
          >
            <Icon as={Ellipsis} size={22} color={moreActive ? 'primary' : 'muted'} />
            <Text variant="caption" weight={moreActive ? 'semibold' : 'medium'} tone={moreActive ? 'primary' : 'muted'}>
              More
            </Text>
          </Pressable>
          <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
            <View className="-mx-5 -mt-2">
              {more.map((item, index) => (
                <ListRow
                  key={item.href}
                  title={item.label}
                  divider={index > 0}
                  onPress={() => {
                    setMoreOpen(false);
                    router.navigate(item.href as Href);
                  }}
                  right={isActive(item, pathname) ? <Pill label="Current page" tone="primary" /> : undefined}
                />
              ))}
            </View>
          </Dialog>
        </>
      ) : null}
    </View>
  );
}
