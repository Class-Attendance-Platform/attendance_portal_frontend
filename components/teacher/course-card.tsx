import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { TeacherCourse } from '@/lib/api/teacher';
import { formatPercent, plural } from '@/lib/format';
import { cn, FOCUS_RING } from '@/lib/utils';
import { courseHref, liveHref } from './labels';

function Figure({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View className="min-w-[96px] flex-1 gap-0.5">
      <Text variant="small" tone={warn ? 'warnInk' : 'muted'}>
        {label}
      </Text>
      <Text weight="bold" tone={warn ? 'warn' : 'default'} tabular>
        {value}
      </Text>
    </View>
  );
}

/** One course on /teacher: numbers at a glance; the whole card opens the course. */
export function CourseCard({ course, minPercent }: { course: TeacherCourse; minPercent: number }) {
  const { isDesktop } = useBreakpoint();
  const live = !!course.live_session_id;
  const finished = !course.semester.is_active;
  const below = course.below_min_count;
  return (
    <View className={cn('border border-border bg-surface', isDesktop ? 'rounded-card' : 'rounded-card-phone')}>
      <Link href={courseHref(course.course_info_id)} asChild>
        <Pressable
          role="link"
          accessibilityLabel={`${course.code}, ${course.title}. ${course.semester.label}. ${plural(course.student_count, 'student')}. Open the course.`}
          className={cn('gap-4 p-4 web:hover:bg-bg active:bg-bg', isDesktop ? 'rounded-card p-5' : 'rounded-card-phone', FOCUS_RING)}
        >
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-0.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text variant="small" weight="semibold" tone="primary">
                  {course.code}
                </Text>
                {live ? <Pill label="Live now" tone="primary" dot /> : null}
                {finished ? <Pill label="Finished" /> : null}
              </View>
              <Text variant="section">{course.title}</Text>
              <Text variant="small" tone="muted">
                {course.semester.label}
              </Text>
            </View>
            <Icon as={ChevronRight} size={20} color="muted" />
          </View>

          <View className="gap-2">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text variant="small" tone="muted">
                Average attendance
              </Text>
              <Text weight="bold" tabular tone={course.average_percent !== null && course.average_percent < minPercent ? 'warn' : 'default'}>
                {formatPercent(course.average_percent)}
              </Text>
            </View>
            <ProgressBar value={course.average_percent} min={minPercent} label={`${course.code} average attendance`} thin />
          </View>

          <View className="flex-row flex-wrap gap-x-4 gap-y-3">
            <Figure label="Students" value={String(course.student_count)} />
            <Figure label="Classes held" value={String(course.classes_held)} />
            <Figure label={`Below ${minPercent}%`} value={String(below)} warn={below > 0} />
            <Figure label="Faces registered" value={`${course.face_registered_count} / ${course.student_count}`} />
          </View>
        </Pressable>
      </Link>
      {live ? (
        <View className={cn('flex-row flex-wrap items-center justify-between gap-2 border-t border-border bg-primary-soft py-3.5', isDesktop ? 'rounded-b-card px-5' : 'rounded-b-card-phone px-4')}>
          <Text variant="small" weight="medium" tone="primary">
            A session is taking attendance now.
          </Text>
          <Link href={liveHref(course.live_session_id!, course.course_info_id)} asChild>
            <TextLink label="Open full screen" small />
          </Link>
        </View>
      ) : null}
    </View>
  );
}
