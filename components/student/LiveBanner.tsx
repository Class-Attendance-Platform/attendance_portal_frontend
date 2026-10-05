import { Link, type Href } from 'expo-router';
import { CircleCheck, ScanLine } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { StudentLiveSession } from '@/lib/api/student';
import { formatTime } from '@/lib/format';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// The banner is green, so its button's keyboard outline is white.
const WHITE_FOCUS_RING =
  'web:outline-none web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-2 web:focus-visible:outline-white';

/** "Live now": a course of the student is taking attendance. Check in, or "Checked in". */
export function LiveBanner({ session }: { session: StudentLiveSession }) {
  const { isDesktop } = useBreakpoint();
  const { course } = session;
  const where = session.delivery === 'ONLINE' ? 'Online class' : 'In class';
  return (
    <View
      role="region"
      accessibilityLabel={`Live attendance: ${course.code}`}
      className={cn(
        'gap-3 bg-primary',
        isDesktop ? 'flex-row flex-wrap items-center justify-between rounded-card px-5 py-4' : 'rounded-card-phone p-4'
      )}
    >
      <View className={cn('gap-0.5', isDesktop && 'min-w-[260px] flex-1')}>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} />
          <Text variant="caption" weight="semibold" style={{ color: colors.primarySoft }}>
            LIVE NOW
          </Text>
        </View>
        <Text weight="semibold" tone="inverse">
          {`${course.code} is taking attendance now`}
        </Text>
        <Text variant="small" style={{ color: colors.primarySoft }}>
          {`${course.title} · ${where} · until ${formatTime(session.ends_at)}`}
        </Text>
      </View>
      {session.checked_in ? (
        <View
          className={cn(
            'min-h-[44px] flex-row items-center justify-center gap-2 rounded-control bg-primary-hover px-4',
            isDesktop && 'self-center'
          )}
          accessible
          accessibilityLabel={`You are checked in to ${course.code}`}
        >
          <Icon as={CircleCheck} size={20} color="white" />
          <Text weight="bold" tone="inverse">
            Checked in
          </Text>
        </View>
      ) : (
        <Link href={`/student/check-in?s=${session.session_id}` as Href} asChild>
          <Pressable
            role="link"
            accessibilityLabel={`Check in to ${course.code}`}
            className={cn(
              'min-h-[44px] flex-row items-center justify-center gap-2 rounded-control bg-surface px-5',
              'active:bg-primary-soft web:hover:bg-primary-soft',
              WHITE_FOCUS_RING
            )}
          >
            <Icon as={ScanLine} size={20} color="primary" />
            <Text weight="bold" tone="primary">
              Check in
            </Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
