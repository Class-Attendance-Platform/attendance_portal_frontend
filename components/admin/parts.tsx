import { Link, type Href } from 'expo-router';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  DataTable,
  ErrorState,
  Icon,
  ListRow,
  LoadingState,
  Notice,
  Pill,
  radioKeys,
  Text,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { semesterClashes, type ApiError } from '@/lib/api';
import { cn, FOCUS_RING } from '@/lib/utils';
import type { LoadState } from './hooks';

// Pieces shared by the admin pages.

/**
 * Shows the loaded data, a spinner on the first load, or the error with "Try again".
 * When a reload fails with data on screen, the data stays and a notice says so.
 */
export function LoadBlock<T>({
  state,
  children,
  loadingLabel,
  errorTitle,
}: {
  state: LoadState<T>;
  children: (data: T) => React.ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
}) {
  if (state.data === null) {
    if (state.error) {
      return (
        <ErrorState title={errorTitle} message={state.error.message} onRetry={() => void state.reload()} retrying={state.loading} />
      );
    }
    return <LoadingState label={loadingLabel} />;
  }
  return (
    <>
      {state.error ? (
        <Notice tone="error" title="Couldn't refresh this" message={state.error.message} live>
          <Button label="Try again" icon={RefreshCw} compact loading={state.loading} onPress={() => void state.reload()} />
        </Notice>
      ) : null}
      {children(state.data)}
    </>
  );
}

/** A form's error that is not about one field (shown in a Notice next to the fields). */
export function FormError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return <Notice tone="error" message={error.message} live />;
}

/**
 * A 409 `already_in_semester` as a notice that stays: the message (it names only the first few)
 * and every student it is about, with the semester each one is in now.
 */
export function SemesterClashNotice({ error, title, onClose }: { error: ApiError | null; title?: string; onClose?: () => void }) {
  const clashes = semesterClashes(error);
  if (!error || !clashes.length) return null;
  return (
    <Notice tone="error" title={title} message={error.message} live>
      <View role="list" accessibilityLabel="Students in another semester" className="w-full gap-1">
        {clashes.map((clash) => (
          <Text key={clash.profile_id} role="listitem" variant="small">
            {clash.name} ({clash.student_id}) · now in {clash.semester_label}
          </Text>
        ))}
      </View>
      {onClose ? <Button label="Close" variant="quiet" compact onPress={onClose} /> : null}
    </Notice>
  );
}

/** The first server error for a field, if any. */
export const fieldError = (error: ApiError | null, ...names: string[]) => {
  for (const name of names) {
    const message = error?.field(name);
    if (message) return message;
  }
  return undefined;
};

export type ResponsiveListProps<T> = {
  /** Read by screen readers, e.g. "Students". */
  label: string;
  rows: T[];
  rowKey: (row: T) => string;
  /** The desktop table's columns. */
  columns: Column<T>[];
  /** The same row on phones. */
  phoneRow: (row: T) => {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    right?: React.ReactNode;
  };
  /** Rows open something (a dialog or a page). */
  onRowPress?: (row: T) => void;
  rowLabel?: (row: T) => string;
};

/**
 * A table from 1100 px, ListRows below (phones, tablets, half-screen windows: next to the sidebar
 * the columns would squeeze names to nothing). Put it in a `Card padded={false}`.
 */
export function ResponsiveList<T>({ label, rows, rowKey, columns, phoneRow, onRowPress, rowLabel }: ResponsiveListProps<T>) {
  const { isWide } = useBreakpoint();
  if (isWide) {
    const withChevron: Column<T>[] = onRowPress
      ? [...columns, { key: '__open', title: '', width: 20, render: () => <Icon as={ChevronRight} size={18} color="muted" /> }]
      : columns;
    return <DataTable label={label} columns={withChevron} rows={rows} rowKey={rowKey} onRowPress={onRowPress} rowLabel={rowLabel} />;
  }
  return (
    <View role="list" accessibilityLabel={label}>
      {rows.map((row, index) => (
        <View key={rowKey(row)} role="listitem">
          <ListRow
            divider={index > 0}
            {...phoneRow(row)}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
            accessibilityLabel={rowLabel?.(row)}
          />
        </View>
      ))}
    </View>
  );
}

/** Label / value rows (a person's details in a dialog). */
export function DetailRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          className={cn('flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5', index > 0 && 'border-t border-border')}
        >
          <Text tone="muted">{row.label}</Text>
          {typeof row.value === 'string' ? (
            <Text weight="medium" selectable className="flex-shrink">
              {row.value}
            </Text>
          ) : (
            row.value
          )}
        </View>
      ))}
    </View>
  );
}

/** Filters above a list: they wrap on phones. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap items-end gap-3">{children}</View>;
}

/** A filter control's width: the search box grows, selects stay narrow (full width on phones). */
export function FilterItem({ children, grow, wide }: { children: React.ReactNode; grow?: boolean; wide?: boolean }) {
  const { isDesktop } = useBreakpoint();
  const size = grow ? 'min-w-[240px] flex-1' : !isDesktop ? 'min-w-[140px] flex-1' : wide ? 'w-[380px]' : 'w-[190px]';
  return <View className={size}>{children}</View>;
}

/** "Deleted", "Waiting for approval" or "Disabled" for an account, else nothing. */
type AccountState = { deleted: boolean; is_verified: boolean; is_active: boolean };

/** The account's state in words ("Deleted", "Waiting for approval", "Disabled"); null when in use. */
export function accountWords(account: AccountState): string | null {
  if (account.deleted) return 'Deleted';
  if (!account.is_verified) return 'Waiting for approval';
  if (!account.is_active) return 'Disabled';
  return null;
}

export function AccountPill({ account }: { account: AccountState }) {
  const words = accountWords(account);
  if (!words) return null;
  return <Pill label={words} tone={account.deleted ? 'absent' : account.is_verified ? 'neutral' : 'warn'} />;
}

/** A row's screen-reader label from its parts (empty ones left out), so the whole row is read. */
export const rowWords = (...parts: (string | null | false | undefined)[]) =>
  parts.filter(Boolean).map((part) => (/[.!?]$/.test(part as string) ? part : `${part}.`)).join(' ');

/** A number tile that is also a link (overview). */
export function LinkTile({
  href,
  label,
  value,
  hint,
  warn,
}: {
  href: Href;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  const { isDesktop } = useBreakpoint();
  return (
    <Link href={href} asChild>
      <Pressable
        role="link"
        accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
        className={cn(
          'min-w-[150px] flex-1 gap-1 border p-4',
          isDesktop ? 'rounded-card' : 'rounded-card-phone',
          warn
            ? 'border-warn-border bg-warn-soft web:hover:border-warn'
            : 'border-border bg-surface active:bg-bg web:hover:border-primary',
          FOCUS_RING
        )}
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="small" tone={warn ? 'warnInk' : 'muted'}>
            {label}
          </Text>
          <Icon as={ChevronRight} size={16} color={warn ? 'warnInk' : 'muted'} />
        </View>
        <Text variant="stat" tone={warn ? 'warn' : 'default'} tabular>
          {value}
        </Text>
        {hint ? (
          <Text variant="small" tone={warn ? 'warnInk' : 'muted'}>
            {hint}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** Two lines in a table cell: main text and a muted line under it. */
export function TwoLines({ main, sub, strong = true }: { main: string; sub?: string | null; strong?: boolean }) {
  return (
    <View className="gap-0.5">
      <Text weight={strong ? 'semibold' : 'regular'}>{main}</Text>
      {sub ? (
        <Text variant="small" tone="muted">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A small radio group as bordered boxes with a description each. Keyboard (web): one Tab stop,
 * the arrow keys move and choose, Space chooses.
 */
export function ChoiceCards<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = React.useRef<(View | null)[]>([]);
  const chosenIndex = choices.findIndex((choice) => choice.value === value);
  return (
    <View role="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-3">
      {choices.map((choice, index) => {
        const selected = index === chosenIndex;
        return (
          <Pressable
            key={choice.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="radio"
            aria-checked={selected}
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={choice.description ? `${choice.label}, ${choice.description}` : choice.label}
            onPress={() => onChange(choice.value)}
            {...radioKeys({
              index,
              count: choices.length,
              tabStop: index === Math.max(chosenIndex, 0),
              onPick: () => onChange(choice.value),
              onMove: (next) => {
                refs.current[next]?.focus();
                onChange(choices[next].value);
              },
            })}
            className={cn(
              'min-h-[44px] min-w-[220px] flex-1 flex-row items-start gap-3 rounded-control border p-3',
              selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface active:bg-bg web:hover:bg-bg',
              FOCUS_RING
            )}
          >
            <View
              className={cn('mt-0.5 h-5 w-5 items-center justify-center rounded-pill border-2', selected ? 'border-primary' : 'border-muted')}
            >
              {selected ? <View className="h-2.5 w-2.5 rounded-pill bg-primary" /> : null}
            </View>
            <View className="flex-1 gap-0.5">
              <Text weight="semibold" tone={selected ? 'primary' : 'default'}>
                {choice.label}
              </Text>
              {choice.description ? (
                <Text variant="small" tone="muted">
                  {choice.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
