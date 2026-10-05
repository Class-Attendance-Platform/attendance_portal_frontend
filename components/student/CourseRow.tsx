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
import { catchUpText } from './logic';

export type CourseRowProps = {
  courseInfoId: string;
  code: string;
  title: string;
  teacher?: string | null;
  attended: number;
  held: number;
  /** null: no class held yet. */
  percent: number | null;
  classesNeeded: number | null;
  belowMin: boolean;
  /** The minimum percentage (75). */
  min: number;
  /** Draw the divider above (all rows but the first). */
  divider?: boolean;
};

/** The warning under a course below the minimum (words, not colour alone). */
export function BelowMinNote({ classesNeeded, min }: { classesNeeded: number | null; min: number }) {
  const catchUp = catchUpText(classesNeeded, min);
  return (
    <View className="self-stretch rounded-[6px] border border-warn-border bg-warn-soft px-2 py-1.5">
      <Text variant="small" tone="warnInk">
        {`Below ${min}%.${catchUp ? ` ${catchUp}` : ''}`}
      </Text>
    </View>
  );
}

/**
 * One course with its attendance: "CSE301 · Software Engineering", the percentage, a plain bar,
 * "9 of 10 classes" and, below the minimum, how many classes to attend. Opens the course page.
 */
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
  divider,
}: CourseRowProps) {
  const { isDesktop } = useBreakpoint();
  const noClasses = held === 0 || percent === null;
  const low = !noClasses && belowMin;
  const name = `${code} · ${title}`;
  const count = noClasses ? 'No classes yet' : `${attended} of ${plural(held, 'class', 'classes')}`;
  const percentText = noClasses ? '—' : formatPercent(percent);
  const catchUp = low ? catchUpText(classesNeeded, min) : '';
  const label = [
    `${code} ${title}`,
    noClasses ? 'No classes yet' : `${percentText} attendance, ${count}`,
    low ? `Below ${min} percent. ${catchUp}` : '',
  ]
    .filter(Boolean)
    .join('. ');

  const percentNode = (
    <Text weight="bold" tabular tone={low ? 'warn' : noClasses ? 'muted' : 'default'} align="right">
      {percentText}
    </Text>
  );
  const bar = <ProgressBar value={noClasses ? null : percent} min={min} thin={!isDesktop} label={`${code} attendance`} />;

  return (
    <Link href={`/student/courses/${courseInfoId}` as Href} asChild>
      <Pressable
        role="link"
        accessibilityLabel={label}
        className={cn(
          'active:bg-bg web:hover:bg-bg',
          isDesktop ? 'min-h-[64px] flex-row items-center gap-6 px-5 py-3.5' : 'gap-1.5 px-4 py-3',
          divider && 'border-t border-border',
          FOCUS_RING
        )}
      >
        {isDesktop ? (
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
              {low ? <BelowMinNote classesNeeded={classesNeeded} min={min} /> : null}
            </View>
            <Icon as={ChevronRight} size={18} color="muted" />
          </>
        ) : (
          <>
            <View className="flex-row items-baseline justify-between gap-2">
              <Text weight="semibold" className="flex-shrink">
                {name}
              </Text>
              {percentNode}
            </View>
            {bar}
            <Text variant="small" tone="muted">
              {teacher ? `${count} · ${teacher}` : count}
            </Text>
            {low ? <BelowMinNote classesNeeded={classesNeeded} min={min} /> : null}
          </>
        )}
      </Pressable>
    </Link>
  );
}
