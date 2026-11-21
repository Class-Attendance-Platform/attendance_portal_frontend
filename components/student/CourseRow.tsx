import { Link, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatPercent, plural } from '@/lib/format';
import { cn, FOCUS_RING } from '@/lib/utils';
import { belowMinText, noClassesText, type CatchUpState } from './logic';

const SIDE_BY_SIDE_MIN = 1024;

export type CourseRowProps = {
  courseInfoId: string;
  code: string;
  title: string;
  teacher?: string | null;
  attended: number;
  held: number;
  percent: number | null;
  classesNeeded: number | null;
  belowMin: boolean;
  min: number;
  catchUp?: CatchUpState;
  divider?: boolean;
};

export function BelowMinNote({ text }: { text: string }) {
  return (
    <View className="self-stretch rounded-control border border-warn-border bg-warn-soft px-2 py-1.5">
      <Text variant="small" tone="warnInk">
        {text}
      </Text>
    </View>
  );
}

export function CourseRow({
  courseInfoId,
  code,
  title,
  teacher,
  attended,
  held,
  percent,
  classesNeeded,
  belowMin,
  min,
  catchUp = 'open',
  divider,
}: CourseRowProps) {
  const { isDesktop, width } = useBreakpoint();
  const sideBySide = width >= SIDE_BY_SIDE_MIN;
  const noClasses = held === 0 || percent === null;
  const low = !noClasses && belowMin;
  const name = `${code} · ${title}`;
  const count = noClasses ? noClassesText(catchUp) : `${attended} of ${plural(held, 'class', 'classes')}`;
  const percentText = noClasses ? '—' : formatPercent(percent);
  const note = low ? belowMinText(classesNeeded, min, catchUp) : '';
  const label = [
    `${code} ${title}`,
    noClasses ? count : `${percentText} attendance, ${count}`,
    note.replace(`${min}%`, `${min} percent`),
  ]
    .filter(Boolean)
    .join('. ');

  const percentNode = (
    <Text weight="bold" tabular tone={low ? 'warn' : noClasses ? 'muted' : 'default'} align="right">
      {percentText}
    </Text>
  );
  const bar = (
    <ProgressBar
      value={noClasses ? null : percent}
      emptyText={noClassesText(catchUp)}
      min={min}
      thin={!isDesktop}
      label={`${code} attendance`}
    />
  );

  return (
    <Link href={`/student/courses/${courseInfoId}` as Href} asChild>
      <Pressable
        role="link"
        accessibilityLabel={label}
        className={cn(
          'active:bg-bg web:hover:bg-bg',
          sideBySide ? 'min-h-[64px] flex-row items-center gap-6 px-5 py-3.5' : cn('gap-1.5 py-3', isDesktop ? 'px-5' : 'px-4'),
          divider && 'border-t border-border',
          FOCUS_RING
        )}
      >
        {sideBySide ? (
          <>
            <View className="flex-1 gap-0.5">
              <Text weight="semibold">{name}</Text>
              {teacher ? (
                <Text variant="small" tone="muted">
                  {teacher}
                </Text>
              ) : null}
            </View>
            <View className="w-[340px] gap-1.5">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">{bar}</View>
                <View className="w-[52px] items-end">{percentNode}</View>
              </View>
              <Text variant="small" tone="muted">
                {count}
              </Text>
              {low ? <BelowMinNote text={note} /> : null}
            </View>
            <Icon as={ChevronRight} size={18} color="muted" />
          </>
        ) : (
          <>
            <View className="flex-row items-baseline justify-between gap-2">
              <Text weight="semibold" className="min-w-0 flex-shrink">
                {name}
              </Text>
              {percentNode}
            </View>
            {bar}
            <Text variant="small" tone="muted">
              {teacher ? `${count} · ${teacher}` : count}
            </Text>
            {low ? <BelowMinNote text={note} /> : null}
          </>
        )}
      </Pressable>
    </Link>
  );
}
