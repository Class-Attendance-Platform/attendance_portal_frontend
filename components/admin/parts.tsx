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
  Text,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { ApiError } from '@/lib/api';
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

/** A table at ≥ 768 px, ListRows on phones. Put it in a `Card padded={false}`. */
export function ResponsiveList<T>({ label, rows, rowKey, columns, phoneRow, onRowPress, rowLabel }: ResponsiveListProps<T>) {
  const { isDesktop } = useBreakpoint();
  if (isDesktop) {
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
export function AccountPill({ account }: { account: { deleted: boolean; is_verified: boolean; is_active: boolean } }) {
  if (account.deleted) return <Pill label="Deleted" tone="absent" />;
  if (!account.is_verified) return <Pill label="Waiting for approval" tone="warn" />;
  if (!account.is_active) return <Pill label="Disabled" tone="neutral" />;
  return null;
}

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

/** One choice of a small radio group, as a bordered box with a description. */
export function ChoiceCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      onPress={onPress}
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
          {label}
        </Text>
        {description ? (
          <Text variant="small" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
