import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions<T> {
  items: T[];
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  hasMore: boolean;
  hasPrevious: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  reset: () => void;
}

export function usePagination<T>({
  items,
  pageSize = 20,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(items.length / pageSize);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, currentPage, pageSize]);

  const hasMore = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  const nextPage = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPrevious]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    hasMore,
    hasPrevious,
    nextPage,
    previousPage,
    goToPage,
    reset,
  };
}

interface UseInfiniteScrollOptions<T> {
  items: T[];
  pageSize?: number;
}

interface UseInfiniteScrollReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  loadedCount: number;
  totalCount: number;
}

export function useInfiniteScroll<T>({
  items,
  pageSize = 20,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [loadedCount, setLoadedCount] = useState(pageSize);

  const visibleItems = useMemo(() => {
    return items.slice(0, loadedCount);
  }, [items, loadedCount]);

  const hasMore = loadedCount < items.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setLoadedCount((prev) => Math.min(prev + pageSize, items.length));
    }
  }, [hasMore, pageSize, items.length]);

  const reset = useCallback(() => {
    setLoadedCount(pageSize);
  }, [pageSize]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    reset,
    loadedCount,
    totalCount: items.length,
  };
}