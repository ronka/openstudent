import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AsyncListArea } from '@/components/async-list-area';
import { ThemedTextInput } from '@/components/form-fields';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { isEnrolled, type CourseCatalogEntry } from '@/data/catalog';
import { useCourses } from '@/data/store';
import { useCatalogSearch } from '@/hooks/use-catalog-search';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Search + multi-select catalog list, shared by `CourseCatalogPicker` (in-app modal) and
 * the onboarding course-selection step. Already-enrolled courses render checked and
 * disabled; the caller owns the in-progress `selected` set and what happens on continue.
 * Sourced from the paginated `/api/catalog` query — no in-memory catalog array.
 */
export function CourseCatalogList({
  selected,
  onToggle,
  style,
  listStyle,
  fallbackEntries,
}: {
  selected: Set<string>;
  onToggle: (entry: CourseCatalogEntry) => void;
  /** Style for the root container — pass `{ flex: 1 }` when the list should fill
   * remaining space (e.g. a full-screen host); left unset keeps the default
   * content-sized behavior the bottom-sheet modal relies on. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the `AsyncListArea` wrapping the loading/error/results states —
   * see that component for sizing rules. */
  listStyle?: StyleProp<ViewStyle>;
  /** Shown (filtered locally) instead of a blank error state when the live catalog
   * query fails — e.g. onboarding's small bundled offline list. Omit to just show the
   * error state on failure. */
  fallbackEntries?: CourseCatalogEntry[];
}) {
  const courses = useCourses();
  const {
    query,
    setQuery,
    debouncedQuery,
    items: rows,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCatalogSearch();

  const usingFallback = isError && fallbackEntries != null;

  const filteredFallback = useMemo(() => {
    if (!fallbackEntries) return [];
    if (!debouncedQuery) return fallbackEntries;
    return fallbackEntries.filter(
      (entry) => entry.name.includes(debouncedQuery) || entry.courseNumber.includes(debouncedQuery),
    );
  }, [fallbackEntries, debouncedQuery]);

  const items = usingFallback ? filteredFallback : rows;

  const handleEndReached = useCallback(() => {
    if (usingFallback) return;
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [usingFallback, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item: entry }: { item: CourseCatalogEntry }) => {
      const enrolled = isEnrolled(entry.courseNumber, courses);
      const checked = enrolled || selected.has(entry.courseNumber);
      const press = () => {
        if (!enrolled) onToggle(entry);
      };
      return (
        <Pressable onPress={press} disabled={enrolled}>
          <ThemedView
            type="backgroundElement"
            className="border border-border"
            style={[styles.row, enrolled && styles.rowDisabled]}>
            <TaskCheckbox checked={checked} onToggle={press} />
            <View style={styles.rowMain}>
              <ThemedText style={styles.rowTitle}>{entry.name}</ThemedText>
              <ThemedText style={styles.rowSubtitle} type="small" themeColor="textSecondary">
                {[entry.courseNumber, ...entry.faculty].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          </ThemedView>
        </Pressable>
      );
    },
    [courses, selected, onToggle],
  );

  return (
    <View style={[styles.body, style]}>
      <ThemedTextInput value={query} onChangeText={setQuery} placeholder="חיפוש לפי שם או מספר קורס" />

      <AsyncListArea isLoading={isLoading} isError={isError && !fallbackEntries} style={listStyle}>
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(entry) => entry.courseNumber}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={!usingFallback && isFetchingNextPage ? <ActivityIndicator /> : null}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              לא נמצאו קורסים
            </ThemedText>
          }
        />
      </AsyncListArea>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
  rowSubtitle: {
    textAlign: rtlTextAlign.start,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    padding: Spacing.three,
  },
});
