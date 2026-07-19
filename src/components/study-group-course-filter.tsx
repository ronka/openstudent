import { useQuery } from '@tanstack/react-query';

import { SelectField, SelectFilterChip, type AsyncSelectSource, type SelectSource } from '@/components/select-modal';
import type { CourseCatalogEntry } from '@/data/catalog';
import { fetchCatalogEntry } from '@/data/catalog-api';
import { useCatalogSearch } from '@/hooks/use-catalog-search';

/** Maps the catalog into the generic `SelectModal` shape, keyed by course number — so
 * study-group discovery/submission works for any course, not just enrolled ones.
 * `matches` is omitted: async mode filters server-side and ignores it. */
const catalogSourceShape: Omit<SelectSource<CourseCatalogEntry>, 'items'> = {
  getKey: (entry) => entry.courseNumber,
  getLabel: (entry) => entry.name,
  getSublabel: (entry) => entry.courseNumber,
  title: 'בחירת קורס',
  searchPlaceholder: 'חיפוש לפי שם או מספר קורס',
  emptyLabel: 'לא נמצאו קורסים',
};

/** Wires the shared `useCatalogSearch` query into `SelectModal`'s async mode. */
function useCatalogSelectSource(): { items: CourseCatalogEntry[]; async: AsyncSelectSource } {
  const { query, setQuery, items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useCatalogSearch();

  return {
    items,
    async: {
      query,
      onQueryChange: setQuery,
      isLoading,
      isError,
      hasMore: hasNextPage,
      onEndReached: () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
    },
  };
}

/** Resolves a bare course number to its catalog entry — used only to render the trigger
 * label for an already-selected course, since the search page it came from may no
 * longer be in `items`. */
function useSelectedEntry(courseNumber: string | undefined) {
  const { data } = useQuery({
    queryKey: ['catalog-entry', courseNumber],
    queryFn: () => fetchCatalogEntry(courseNumber!),
    enabled: !!courseNumber,
    staleTime: Infinity,
  });
  return data;
}

/** Labeled form field for picking a catalog course (by course number). */
export function CatalogSelectField({
  label,
  selectedCourseNumber,
  onSelect,
  placeholder = 'בחרו קורס',
}: {
  label: string;
  selectedCourseNumber?: string;
  onSelect: (courseNumber: string) => void;
  placeholder?: string;
}) {
  const { items, async } = useCatalogSelectSource();
  const selectedItem = useSelectedEntry(selectedCourseNumber);

  return (
    <SelectField
      {...catalogSourceShape}
      items={items}
      async={async}
      selectedItem={selectedItem}
      label={label}
      placeholder={placeholder}
      selectedKey={selectedCourseNumber}
      onSelect={onSelect}
    />
  );
}

/** Chip-style trigger for filter bars over the catalog. */
export function CatalogFilterChip({
  selectedCourseNumber,
  onChange,
  clearLabel,
}: {
  selectedCourseNumber: string | undefined;
  onChange: (courseNumber: string | undefined) => void;
  clearLabel: string;
}) {
  const { items, async } = useCatalogSelectSource();
  const selectedItem = useSelectedEntry(selectedCourseNumber);

  return (
    <SelectFilterChip
      {...catalogSourceShape}
      items={items}
      async={async}
      selectedItem={selectedItem}
      selectedKey={selectedCourseNumber}
      onChange={onChange}
      clearLabel={clearLabel}
    />
  );
}
