import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn, FOCUS_RING } from '@/lib/utils';
import { Icon } from './icon';
import { Text } from './text';

export type PaginationProps = {
  /** 1-based current page */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems?: number;
  /** Items per page */
  pageSize?: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available page size options (e.g. [15, 30, 50]) */
  pageSizeOptions?: number[];
  /** Plural noun for items, e.g. "courses", "students" */
  itemLabel?: string;
  /** Hide the pagination bar when totalPages <= 1 (default true) */
  hideOnSinglePage?: boolean;
  /** Compact mode (hides text on Next/Previous buttons) */
  compact?: boolean;
  className?: string;
};

export type UsePaginationOptions = {
  /** Default items per page (default: 15) */
  pageSize?: number;
  /** Initial page (default: 1) */
  initialPage?: number;
};

/**
 * Manages pagination state and computes the sliced subset of items.
 */
export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const [pageSize, setPageSize] = React.useState(options.pageSize ?? 15);
  const [page, setPage] = React.useState(options.initialPage ?? 1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If items shrink (e.g. search filter) and current page is beyond totalPages, adjust.
  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedItems = React.useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  const changePage = React.useCallback(
    (nextPage: number) => {
      setPage(Math.min(Math.max(1, nextPage), totalPages));
    },
    [totalPages]
  );

  const changePageSize = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const resetPage = React.useCallback(() => {
    setPage(1);
  }, []);

  return {
    page: safePage,
    setPage: changePage,
    pageSize,
    setPageSize: changePageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    pagedItems,
    resetPage,
  };
}

/**
 * Accessible pagination controls for desktop and mobile.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  itemLabel = 'items',
  hideOnSinglePage = true,
  compact = false,
  className,
}: PaginationProps) {
  const { isDesktop } = useBreakpoint();

  if (hideOnSinglePage && totalPages <= 1 && (!pageSizeOptions || !onPageSizeChange)) {
    return null;
  }

  const start = totalItems !== undefined && pageSize !== undefined && totalItems > 0 ? (page - 1) * pageSize + 1 : undefined;
  const end = totalItems !== undefined && pageSize !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View
      role="navigation"
      accessibilityLabel="Pagination"
      className={cn(
        'flex-row flex-wrap items-center justify-between gap-3 border-t border-border bg-bg/40 px-4 py-3',
        className
      )}
    >
      <View className="flex-row flex-wrap items-center gap-3">
        {totalItems !== undefined && start !== undefined && end !== undefined ? (
          <Text variant="small" tone="muted">
            {totalItems === 0 ? `0 ${itemLabel}` : `Showing ${start}–${end} of ${totalItems} ${itemLabel}`}
          </Text>
        ) : null}

        {pageSizeOptions && onPageSizeChange && pageSize ? (
          <View className="flex-row items-center gap-1.5">
            <Text variant="small" tone="muted">
              Per page:
            </Text>
            {pageSizeOptions.map((size) => {
              const active = size === pageSize;
              return (
                <Pressable
                  key={size}
                  role="button"
                  aria-pressed={active}
                  accessibilityLabel={`Show ${size} ${itemLabel} per page`}
                  onPress={() => onPageSizeChange(size)}
                  className={cn(
                    'h-7 min-w-[32px] items-center justify-center rounded border px-2',
                    active ? 'border-primary bg-primary' : 'border-border bg-surface active:bg-bg web:hover:bg-bg',
                    FOCUS_RING
                  )}
                >
                  <Text variant="small" weight={active ? 'semibold' : 'regular'} tone={active ? 'inverse' : 'muted'}>
                    {size}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-1.5">
        {totalPages > 4 ? (
          <Pressable
            role="button"
            disabled={!canPrev}
            accessibilityLabel="First page"
            onPress={() => onPageChange(1)}
            className={cn(
              'h-8 w-8 items-center justify-center rounded border border-border bg-surface',
              !canPrev ? 'opacity-40' : 'active:bg-bg web:hover:bg-bg',
              FOCUS_RING
            )}
          >
            <Icon as={ChevronsLeft} size={16} color={canPrev ? 'text' : 'muted'} />
          </Pressable>
        ) : null}

        <Pressable
          role="button"
          disabled={!canPrev}
          accessibilityLabel="Previous page"
          onPress={() => onPageChange(page - 1)}
          className={cn(
            'h-8 flex-row items-center gap-1 rounded border border-border bg-surface px-2.5',
            !canPrev ? 'opacity-40' : 'active:bg-bg web:hover:bg-bg',
            FOCUS_RING
          )}
        >
          <Icon as={ChevronLeft} size={16} color={canPrev ? 'text' : 'muted'} />
          {!compact && isDesktop ? (
            <Text variant="small" weight="medium" tone={canPrev ? 'default' : 'muted'}>
              Previous
            </Text>
          ) : null}
        </Pressable>

        <View className="px-2">
          <Text variant="small" weight="medium" tabular tone="muted">
            Page {page} of {totalPages}
          </Text>
        </View>

        <Pressable
          role="button"
          disabled={!canNext}
          accessibilityLabel="Next page"
          onPress={() => onPageChange(page + 1)}
          className={cn(
            'h-8 flex-row items-center gap-1 rounded border border-border bg-surface px-2.5',
            !canNext ? 'opacity-40' : 'active:bg-bg web:hover:bg-bg',
            FOCUS_RING
          )}
        >
          {!compact && isDesktop ? (
            <Text variant="small" weight="medium" tone={canNext ? 'default' : 'muted'}>
              Next
            </Text>
          ) : null}
          <Icon as={ChevronRight} size={16} color={canNext ? 'text' : 'muted'} />
        </Pressable>

        {totalPages > 4 ? (
          <Pressable
            role="button"
            disabled={!canNext}
            accessibilityLabel="Last page"
            onPress={() => onPageChange(totalPages)}
            className={cn(
              'h-8 w-8 items-center justify-center rounded border border-border bg-surface',
              !canNext ? 'opacity-40' : 'active:bg-bg web:hover:bg-bg',
              FOCUS_RING
            )}
          >
            <Icon as={ChevronsRight} size={16} color={canNext ? 'text' : 'muted'} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
