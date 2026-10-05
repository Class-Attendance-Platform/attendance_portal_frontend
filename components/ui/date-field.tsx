import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { addMonths, compareISODate, monthGrid, parseISODate, todayISO } from '@/lib/dates';
import { formatDate, formatDateWithWeekday, formatMonth, weekdayShort } from '@/lib/format';
import { cn, FOCUS_RING } from '@/lib/utils';
import { Button, IconButton } from './button';
import { Dialog } from './dialog';
import { controlBoxClass, describedBy, FieldFrame } from './field';
import { Icon } from './icon';
import { Text } from './text';

export type DateFieldProps = {
  label: string;
  hideLabel?: boolean;
  /** `YYYY-MM-DD` or null. */
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** Days after today (Dhaka) cannot be picked. */
  noFuture?: boolean;
  /** `YYYY-MM-DD` limits. */
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Shows "05 Oct 2026"; opens a month calendar (Sunday first). */
export function DateField({
  label,
  hideLabel,
  value,
  onChange,
  noFuture,
  minDate,
  maxDate,
  placeholder = 'Pick a date',
  hint,
  error,
  required,
  disabled,
  className,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const messageId = React.useId();
  const today = todayISO();
  const latest = noFuture ? (maxDate && compareISODate(maxDate, today) < 0 ? maxDate : today) : maxDate;
  const start = parseISODate(value) ?? parseISODate(latest && compareISODate(latest, today) < 0 ? latest : today)!;
  const [month, setMonth] = React.useState({ year: start.year, month: start.month });

  const openCalendar = () => {
    if (disabled) return;
    setMonth({ year: start.year, month: start.month });
    setOpen(true);
  };

  const isAllowed = (day: string) =>
    (!minDate || compareISODate(day, minDate) >= 0) && (!latest || compareISODate(day, latest) <= 0);

  const pick = (day: string) => {
    onChange(day);
    setOpen(false);
  };

  const weeks = monthGrid(month.year, month.month);

  return (
    <FieldFrame
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      required={required}
      onLabelPress={openCalendar}
      messageId={messageId}
      className={cn('gap-1.5', className)}
    >
      <Pressable
        role="button"
        accessibilityLabel={`${label}: ${value ? formatDateWithWeekday(value) : 'not chosen'}`}
        accessibilityHint={error ?? hint ?? 'Opens a calendar'}
        {...describedBy(messageId, !!(error || hint))}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        aria-haspopup="dialog"
        disabled={disabled}
        onPress={openCalendar}
        className={cn(controlBoxClass({ error: !!error, disabled }), 'justify-between gap-2 py-2 active:bg-bg web:hover:bg-bg', FOCUS_RING)}
      >
        <Text tone={value ? 'default' : 'muted'} tabular>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Icon as={Calendar} size={18} color="muted" />
      </Pressable>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        size="sm"
        actions={
          <>
            <Button label="Cancel" onPress={() => setOpen(false)} />
            {isAllowed(today) ? <Button label="Today" variant="primary" onPress={() => pick(today)} /> : null}
          </>
        }
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel="Previous month"
              color="text"
              onPress={() => setMonth((current) => addMonths(current.year, current.month, -1))}
            />
            <Text weight="semibold" accessibilityLiveRegion="polite">
              {formatMonth(month.year, month.month)}
            </Text>
            <IconButton
              icon={ChevronRight}
              accessibilityLabel="Next month"
              color="text"
              onPress={() => setMonth((current) => addMonths(current.year, current.month, 1))}
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
                  const allowed = isAllowed(day);
                  const selected = day === value;
                  const isToday = day === today;
                  return (
                    <View key={column} className="flex-1 items-center">
                      <Pressable
                        role="button"
                        accessibilityLabel={`${formatDateWithWeekday(day)}${isToday ? ', today' : ''}${allowed ? '' : ', not available'}`}
                        accessibilityState={{ selected, disabled: !allowed }}
                        disabled={!allowed}
                        onPress={() => pick(day)}
                        className={cn(
                          'h-11 w-11 items-center justify-center rounded-control',
                          selected ? 'bg-primary' : allowed ? 'active:bg-primary-soft web:hover:bg-primary-soft' : '',
                          isToday && !selected ? 'border border-primary' : '',
                          FOCUS_RING
                        )}
                      >
                        <Text
                          tabular
                          weight={selected || isToday ? 'semibold' : 'regular'}
                          tone={selected ? 'inverse' : allowed ? 'default' : 'muted'}
                          style={allowed ? undefined : { opacity: 0.55 }}
                        >
                          {Number(day.slice(8, 10))}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </Dialog>
    </FieldFrame>
  );
}
