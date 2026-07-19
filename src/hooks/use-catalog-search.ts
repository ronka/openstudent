import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { fetchCatalogPage } from '@/data/catalog-api';
import type { CourseCatalogEntry } from '@/data/catalog';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced, paginated `/api/catalog` search shared by every catalog-search surface
 * (the catalog picker/onboarding list and the study-group course filter) so they stay
 * on one query key (react-query cache is shared) and one retry/offline policy.
 */
export function useCatalogSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['catalog', debouncedQuery],
    queryFn: ({ pageParam }) => fetchCatalogPage({ q: debouncedQuery, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    // `networkMode: 'always'` always attempts the real fetch (skipping react-query's own
    // online/offline detection) so a real fetch failure surfaces as `isError` instead of
    // leaving the query silently "paused" with no data and no error — which would happen
    // under the default networkMode if this app ever wires up NetInfo/onlineManager.
    // `retry: 1` keeps the offline wait short.
    networkMode: 'always',
    retry: 1,
  });

  const items = useMemo<CourseCatalogEntry[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);

  return {
    query,
    setQuery,
    debouncedQuery,
    items,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}
