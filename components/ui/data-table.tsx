import * as React from 'react';
import { Pressable, View, type DimensionValue } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { Text } from './text';

export type Column<T> = {
  key: string;
  title: string;
  /** Share of the free width (default 1). */
  flex?: number;
  /** Fixed width in px (overrides flex). */
  width?: DimensionValue;
  align?: 'left' | 'right' | 'center';
  /** Cell content; default: `String(row[key])`. Return a string for plain text. */
  render?: (row: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes rows pressable (e.g. open the student). */
  onRowPress?: (row: T) => void;
  /** Read by screen readers for pressable rows, e.g. (row) => `Open ${row.name}`. */
  rowLabel?: (row: T) => string;
  /** Shown instead of rows when there are none. */
  empty?: React.ReactNode;
  /** Read by screen readers, e.g. "Students". */
  label: string;
};

function cellStyle<T>(column: Column<T>) {
  return column.width !== undefined ? { width: column.width } : { flex: column.flex ?? 1 };
}

const justify = { left: 'flex-start', right: 'flex-end', center: 'center' } as const;

/**
 * A plain table for desktop widths (≥ 768 px). On phones show the same rows as ListRows.
 * Put it in a Card with `padded={false}`.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowPress, rowLabel, empty, label }: DataTableProps<T>) {
  return (
    <View role="table" accessibilityLabel={label}>
      <View role="row" className="flex-row gap-4 border-b border-border bg-bg px-5 py-2.5">
        {columns.map((column) => (
          <View key={column.key} role="columnheader" style={[cellStyle(column), { alignItems: justify[column.align ?? 'left'] }]}>
            <Text variant="small" weight="semibold" tone="muted" align={column.align}>
              {column.title}
            </Text>
          </View>
        ))}
      </View>
      {rows.length === 0 && empty ? <View className="p-5">{empty}</View> : null}
      {rows.map((row, index) => {
        const cells = columns.map((column) => {
          const content = column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '');
          return (
            <View
              key={column.key}
              role="cell"
              style={[cellStyle(column), { alignItems: justify[column.align ?? 'left'], justifyContent: 'center' }]}
            >
              {typeof content === 'string' || typeof content === 'number' ? (
                <Text align={column.align} tabular={column.align === 'right'}>
                  {content}
                </Text>
              ) : (
                content
              )}
            </View>
          );
        });
        const rowClass = cn('min-h-[52px] flex-row items-center gap-4 px-5 py-2.5', index > 0 && 'border-t border-border');
        return onRowPress ? (
          <Pressable
            key={rowKey(row)}
            role="row"
            accessibilityLabel={rowLabel?.(row)}
            onPress={() => onRowPress(row)}
            className={cn(rowClass, 'active:bg-bg web:hover:bg-bg', FOCUS_RING)}
          >
            {cells}
          </Pressable>
        ) : (
          <View key={rowKey(row)} role="row" className={rowClass}>
            {cells}
          </View>
        );
      })}
    </View>
  );
}
