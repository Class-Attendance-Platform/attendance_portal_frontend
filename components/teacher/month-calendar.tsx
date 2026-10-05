import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { ClassDate } from '@/lib/api/teacher';
import { addMonths, isFutureDate, monthGrid, todayISO } from '@/lib/dates';
import { formatDateWithWeekday, formatMonth, weekdayShort } from '@/lib/format';
import { colors } from '@/lib/theme';
import { cn, FOCUS_RING } from '@/lib/utils';

export type MonthCalendarProps = {
  year: number;
  month: number;
  onMonthChange: (next: { year: number; month: number }) => void;
  /** Class dates of the course (a date = a class). */
  classes: Map<string, ClassDate>;
  selected: string | null;
  onSelect: (date: string) => void;
};

/** A month grid (Sunday first) that marks the class dates. No animation. Future days are off. */
export function MonthCalendar({ year, month, onMonthChange, classes, selected, onSelect }: MonthCalendarProps) {
  const today = todayISO();
  const weeks = monthGrid(year, month);
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Previous month"
          color="text"
          onPress={() => onMonthChange(addMonths(year, month, -1))}
        />
        <Text weight="semibold" accessibilityLiveRegion="polite">
          {formatMonth(year, month)}
        </Text>
        <IconButton
          icon={ChevronRight}
          accessibilityLabel="Next month"
          color="text"
          onPress={() => onMonthChange(addMonths(year, month, 1))}
        />
      </View>
      <View className="flex-row">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} className="flex-1 items-center py-1">
            <Text variant="caption" tone="muted" weight="semibold">
              {weekdayShort(index)}
            </Text>
          </View>
        ))}
      </View>
      <View className="gap-1">
        {weeks.map((week, row) => (
          <View key={row} className="flex-row">
            {week.map((day, column) => {
              if (!day) return <View key={column} className="h-11 flex-1" />;
              const info = classes.get(day);
              const future = isFutureDate(day);
              const isSelected = day === selected;
              const isToday = day === today;
              const label = `${formatDateWithWeekday(day)}${isToday ? ', today' : ''}${
                info ? `, class: ${info.present} of ${info.total} present` : ', no class'
              }${future ? ', not available' : ''}`;
              return (
                <View key={column} className="flex-1 items-center">
                  <Pressable
                    role="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isSelected, disabled: future }}
                    aria-pressed={isSelected}
                    disabled={future}
                    onPress={() => onSelect(day)}
                    className={cn(
                      'h-11 w-11 items-center justify-center rounded-control',
                      isSelected
                        ? 'bg-primary'
                        : info
                          ? 'bg-primary-soft web:hover:bg-primary-soft'
                          : future
                            ? ''
                            : 'web:hover:bg-bg active:bg-bg',
                      isToday && !isSelected ? 'border border-primary' : '',
                      FOCUS_RING
                    )}
                  >
                    <Text
                      tabular
                      weight={info || isSelected || isToday ? 'semibold' : 'regular'}
                      tone={isSelected ? 'inverse' : info ? 'primary' : future ? 'muted' : 'default'}
                      style={future ? { opacity: 0.55 } : undefined}
                    >
                      {Number(day.slice(8, 10))}
                    </Text>
                    {info ? (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 5,
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: isSelected ? colors.white : colors.primary,
                        }}
                      />
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className="mt-1 flex-row flex-wrap items-center gap-x-4 gap-y-1" aria-hidden>
        <View className="flex-row items-center gap-1.5">
          <View className="h-4 w-4 items-center justify-center rounded-[4px] bg-primary-soft">
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />
          </View>
          <Text variant="caption" tone="muted">
            Class held
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-4 w-4 rounded-[4px] border border-primary" />
          <Text variant="caption" tone="muted">
            Today
          </Text>
        </View>
      </View>
    </View>
  );
}
