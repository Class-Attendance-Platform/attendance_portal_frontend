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
  Pagination,
  Pill,
  radioKeys,
  Text,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { semesterClashes, type ApiError } from '@/lib/api';
import { cn, FOCUS_RING } from '@/lib/utils';
import type { LoadState } from './hooks';

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

export function FormError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return <Notice tone="error" message={error.message} live />;
}

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

export const fieldError = (error: ApiError | null, ...names: string[]) => {
  for (const name of names) {
    const message = error?.field(name);
    if (message) return message;
  }
  return undefined;
};

export type ResponsiveListProps<T> = {
  label: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  phoneRow: (row: T) => {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    right?: React.ReactNode;
  };
  onRowPress?: (row: T) => void;
  rowLabel?: (row: T) => string;
  pageSize?: number;
  paginate?: boolean;
  pageSizeOptions?: number[];
  itemLabel?: string;
};

export function ResponsiveList<T>({
  label,
  rows,
  rowKey,
  columns,
  phoneRow,
  onRowPress,
  rowLabel,
  pageSize: initialPageSize = 15,
  paginate = true,
  pageSizeOptions,
  itemLabel,
}: ResponsiveListProps<T>) {
  const { isWide } = useBreakpoint();
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [page, setPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const shouldPaginate = paginate && rows.length > 0;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = shouldPaginate ? (safePage - 1) * pageSize : 0;
  const endIndex = shouldPaginate ? Math.min(startIndex + pageSize, rows.length) : rows.length;
  const visibleRows = shouldPaginate ? rows.slice(startIndex, endIndex) : rows;

  const withChevron: Column<T>[] = onRowPress
    ? [...columns, { key: '__open', title: '', width: 20, render: () => <Icon as={ChevronRight} size={18} color="muted" /> }]
    : columns;

  return (
    <View className="w-full">
      {isWide ? (
        <DataTable label={label} columns={withChevron} rows={visibleRows} rowKey={rowKey} onRowPress={onRowPress} rowLabel={rowLabel} />
      ) : (
        <View role="list" accessibilityLabel={label}>
          {visibleRows.map((row, index) => (
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
      )}

      {shouldPaginate ? (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={rows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={pageSizeOptions ? (size) => { setPageSize(size); setPage(1); } : undefined}
          pageSizeOptions={pageSizeOptions}
          itemLabel={itemLabel ?? label.toLowerCase()}
        />
      ) : null}
    </View>
  );
}

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

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap items-end gap-3">{children}</View>;
}

export function FilterItem({ children, grow, wide }: { children: React.ReactNode; grow?: boolean; wide?: boolean }) {
  const { isDesktop } = useBreakpoint();
  const size = grow ? 'min-w-[240px] flex-1' : !isDesktop ? 'min-w-[140px] flex-1' : wide ? 'w-[380px]' : 'w-[190px]';
  return <View className={size}>{children}</View>;
}

type AccountState = { deleted: boolean; is_verified: boolean; is_active: boolean };

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

export const rowWords = (...parts: (string | null | false | undefined)[]) =>
  parts.filter(Boolean).map((part) => (/[.!?]$/.test(part as string) ? part : `${part}.`)).join(' ');

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
