import { Link, router, useLocalSearchParams } from 'expo-router';
import { CalendarPlus, CalendarX2, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useMessage } from '@/components/ui/message-bar';
import { StatusPill } from '@/components/ui/pill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { isApiError } from '@/lib/api/client';
import { sessionsApi, type HistoryDay, type HistoryLog } from '@/lib/api/sessions';
import { teacherApi, type ClassDate, type SetAttendanceResponse } from '@/lib/api/teacher';
import type { UUID } from '@/lib/api/types';
import { isFutureDate, parseISODate, todayISO } from '@/lib/dates';
import { formatDate, formatDateTime, formatDateWithWeekday } from '@/lib/format';
import { cn, FOCUS_RING } from '@/lib/utils';
import { FlipButton, useCorrection } from './correction';
import { deliveryLabel, methodLabel, param, rollCallHref } from './labels';
import { MonthCalendar } from './month-calendar';
import { useLoad } from './use-load';

function changedText(log: { changed_by: string | null; changed_at: string | null }): string | null {
  if (!log.changed_by && !log.changed_at) return null;
  return `Changed by ${log.changed_by ?? 'someone'}${log.changed_at ? `, ${formatDateTime(log.changed_at)}` : ''}`;
}

function daySessionsText(day: HistoryDay): string {
  if (!day.sessions.length) return 'Roll call';
  const kinds = day.sessions.map((session) =>
    session.mode === 'FACE' ? 'Class photo' : `Live session (${deliveryLabel(session.delivery).toLowerCase()})`
  );
  return Array.from(new Set(kinds)).join(' + ');
}

type DayRecordsProps = {
  courseInfoId: UUID;
  date: string;
  onChanged: () => void;
  onDeleted: () => void;
};

/** One date's records with a Present/Absent switch per student and "Delete this date". */
function DayRecords({ courseInfoId, date, onChanged, onDeleted }: DayRecordsProps) {
  const { width, isDesktop } = useBreakpoint();
  // A table when there is room for the name next to the four other columns.
  const wide = width >= 1024;
  const confirm = useConfirm();
  const message = useMessage();
  const [deleting, setDeleting] = React.useState(false);
  const day = useLoad(async () => (await sessionsApi.history(courseInfoId, { date })).history[0] ?? null, [courseInfoId, date]);

  const onSaved = React.useCallback(
    (result: SetAttendanceResponse, profileId: UUID) => {
      day.setData((current) =>
        current
          ? {
              ...current,
              logs: current.logs.map((log) =>
                log.profile_id === profileId
                  ? { ...log, status: result.day.status, method: result.day.method, changed_by: result.day.changed_by, changed_at: result.day.changed_at }
                  : log
              ),
            }
          : current
      );
      if (result.changed) onChanged();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChanged]
  );
  const correction = useCorrection(courseInfoId, onSaved);

  async function remove() {
    const count = day.data?.logs.length ?? 0;
    const ok = await confirm({
      title: `Delete the class on ${formatDate(date)}?`,
      message: `This removes the attendance of ${count} ${count === 1 ? 'student' : 'students'} for this date. It cannot be undone.`,
      confirmLabel: 'Delete this date',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const result = await teacherApi.deleteClass(courseInfoId, date);
      message.success(result.message || `The class on ${formatDate(date)} was deleted.`);
      onDeleted();
    } catch (caught) {
      message.error(isApiError(caught) ? caught.message : 'Could not delete the class.');
    } finally {
      setDeleting(false);
    }
  }

  const title = formatDateWithWeekday(date);

  if (day.loading) {
    return (
      <Card title={title}>
        <LoadingState label="Loading this day…" />
      </Card>
    );
  }
  if (day.error) {
    return (
      <Card title={title}>
        <ErrorState message={day.error.message} onRetry={() => day.reload()} />
      </Card>
    );
  }
  if (!day.data) {
    const future = isFutureDate(date);
    return (
      <Card title={title}>
        <EmptyState
          icon={CalendarX2}
          title="No class on this date"
          message={future ? 'This date is in the future.' : 'Add a class for this date with a roll call.'}
          action={future ? undefined : { label: 'Add a class for this date', icon: CalendarPlus, onPress: () => router.push(rollCallHref(courseInfoId, date)) }}
        />
      </Card>
    );
  }

  const logs = day.data.logs;
  const present = logs.filter((log) => log.status === 'PRESENT').length;

  const flip = (log: HistoryLog) => (next: 'PRESENT' | 'ABSENT') => correction.change(date, log.profile_id, next, log.name);

  const columns: Column<HistoryLog>[] = [
    { key: 'student_id', title: 'Student ID', width: 96, render: (log) => String(log.student_id) },
    {
      key: 'name',
      title: 'Name',
      flex: 2,
      render: (log) => {
        const changed = changedText(log);
        return (
          <View className="gap-0.5">
            <Text weight="semibold">{log.name}</Text>
            {changed ? (
              <Text variant="small" tone="muted">
                {changed}
              </Text>
            ) : null}
          </View>
        );
      },
    },
    { key: 'status', title: 'Status', width: 120, render: (log) => <StatusPill status={log.status} /> },
    { key: 'method', title: 'How', width: 150, render: (log) => methodLabel(log.method) },
    {
      key: 'action',
      title: 'Change',
      width: 150,
      render: (log) => (
        <FlipButton status={log.status} name={log.name} date={date} busy={correction.isBusy(date, log.profile_id)} onFlip={flip(log)} />
      ),
    },
  ];

  return (
    <Card
      padded={false}
      title={title}
      titleNote={`${present} of ${logs.length} present`}
      actions={<Button label="Delete this date" icon={Trash2} variant="quiet" destructive compact loading={deleting} onPress={remove} />}
      className="pb-2"
    >
      <Text variant="small" tone="muted" className={cn('mt-1', isDesktop ? 'px-5' : 'px-4')}>
        {daySessionsText(day.data)}
      </Text>
      <View className="mt-3">
        {wide ? (
          <DataTable label={`Attendance on ${formatDate(date)}`} columns={columns} rows={logs} rowKey={(log) => log.profile_id} />
        ) : (
          logs.map((log, index) => {
            const changed = changedText(log);
            return (
              <View key={log.profile_id} className={cn('gap-2 py-3', isDesktop ? 'px-5' : 'px-4', index > 0 && 'border-t border-border')}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text weight="semibold">{log.name}</Text>
                    <Text variant="small" tone="muted">
                      {log.student_id} · {methodLabel(log.method)}
                    </Text>
                    {changed ? (
                      <Text variant="small" tone="muted">
                        {changed}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill status={log.status} />
                </View>
                <FlipButton status={log.status} name={log.name} date={date} busy={correction.isBusy(date, log.profile_id)} onFlip={flip(log)} />
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

/** Shorter than this, the whole list shows. */
const SHORT_DATES = 7;

function DateList({ dates, selected, onSelect }: { dates: ClassDate[]; selected: string | null; onSelect: (date: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const shown = open ? dates : dates.slice(0, SHORT_DATES);
  return (
    <Card
      title="Class dates"
      titleNote={`(${dates.length})`}
      padded={false}
      className="pb-2"
      actions={
        dates.length > SHORT_DATES ? (
          <Button
            label={open ? 'Show fewer' : `Show all (${dates.length})`}
            variant="quiet"
            compact
            onPress={() => setOpen((value) => !value)}
          />
        ) : undefined
      }
    >
      {dates.length === 0 ? (
        <Text tone="muted" className="px-5 py-4">
          No classes yet.
        </Text>
      ) : (
        <View className="mt-2">
          {shown.map((item, index) => {
            const active = item.date === selected;
            return (
              <Pressable
                key={item.date}
                role="button"
                aria-pressed={active}
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${formatDateWithWeekday(item.date)}: ${item.present} of ${item.total} present`}
                onPress={() => onSelect(item.date)}
                className={cn(
                  'min-h-[48px] flex-row items-center justify-between gap-3 px-5 py-2.5',
                  index > 0 && 'border-t border-border',
                  active ? 'bg-primary-soft' : 'web:hover:bg-bg active:bg-bg',
                  FOCUS_RING
                )}
              >
                <Text weight={active ? 'semibold' : 'regular'} tone={active ? 'primary' : 'default'} tabular>
                  {formatDateWithWeekday(item.date)}
                </Text>
                <Text variant="small" tone={active ? 'primary' : 'muted'} tabular>
                  {item.present} / {item.total} present
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export type HistoryTabProps = {
  courseInfoId: UUID;
  /** The course's class dates, newest first. */
  dates: ClassDate[];
  /** Reload the course (numbers and dates). */
  onChanged: () => void;
};

/** ?tab=history&date=: calendar and list of class dates; one date's records with corrections. */
export function HistoryTab({ courseInfoId, dates, onChanged }: HistoryTabProps) {
  const { width, isDesktop } = useBreakpoint();
  const twoColumns = isDesktop && width >= 1100;
  const params = useLocalSearchParams<{ date?: string }>();
  const fromUrl = param(params.date);
  const urlDate = fromUrl && parseISODate(fromUrl) ? fromUrl : null;
  const selected = urlDate ?? dates[0]?.date ?? null;

  const classes = React.useMemo(() => new Map(dates.map((item) => [item.date, item])), [dates]);
  const start = parseISODate(selected ?? todayISO())!;
  const [month, setMonth] = React.useState({ year: start.year, month: start.month });
  React.useEffect(() => {
    const parts = parseISODate(selected ?? todayISO());
    if (parts) setMonth({ year: parts.year, month: parts.month });
  }, [selected]);

  const select = (date: string) => router.setParams({ date });

  const calendar = (
    <Card title="Calendar" className="gap-3">
      <MonthCalendar
        year={month.year}
        month={month.month}
        onMonthChange={setMonth}
        classes={classes}
        selected={selected}
        onSelect={select}
      />
    </Card>
  );

  const records = selected ? (
    <DayRecords
      key={selected}
      courseInfoId={courseInfoId}
      date={selected}
      onChanged={onChanged}
      onDeleted={() => {
        router.setParams({ date: undefined });
        onChanged();
      }}
    />
  ) : (
    <Card>
      <EmptyState
        icon={CalendarX2}
        title="No classes yet"
        message="Classes show here after a live session, a class photo or a roll call is saved."
        action={{ label: 'Add a class for a date', icon: CalendarPlus, onPress: () => router.push(rollCallHref(courseInfoId)) }}
      />
    </Card>
  );

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text tone="muted" className="flex-1" style={{ minWidth: 220 }}>
          Pick a date to see who was present and to correct it. One date counts as one class.
        </Text>
        <Link href={rollCallHref(courseInfoId, selected && !classes.has(selected) ? selected : null)} asChild>
          <Button label="Add a class for a date" icon={CalendarPlus} />
        </Link>
      </View>
      {twoColumns ? (
        <View className="gap-5">
          <View className="flex-row items-start gap-5">
            <View style={{ width: 360 }}>{calendar}</View>
            <View className="flex-1">
              <DateList dates={dates} selected={selected} onSelect={select} />
            </View>
          </View>
          {records}
        </View>
      ) : (
        <View className="gap-4">
          {calendar}
          {records}
          <DateList dates={dates} selected={selected} onSelect={select} />
        </View>
      )}
    </View>
  );
}
