import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AsyncListArea, useResponsiveListHeight } from '@/components/async-list-area';
import { FilterChip } from '@/components/filter-chip';
import { Field, ThemedTextInput } from '@/components/form-fields';
import { FormSheet } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { rtlTextAlign } from '@/utils/rtl';

/**
 * Generic single-select picker over any list of items, keyed by a string. Backs both
 * the enrolled-course picker (`course-select-modal`) and the catalog picker
 * (`study-group-course-filter`); wire it up per data shape via `getKey`/`getLabel`/
 * `getSublabel`/`matches` rather than copying the modal body.
 */
export type SelectSource<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string | undefined;
  /** Required for local filtering; omit only when `async` mode filters server-side. */
  matches?: (item: T, query: string) => boolean;
  title: string;
  searchPlaceholder?: string;
  emptyLabel: string;
};

/**
 * Opt-in async mode: `items` is already filtered by an outside paginated source (e.g. a
 * server query keyed off `query`) — `matches` is ignored, and the modal reports its
 * search text upward via `onQueryChange` instead of filtering `items` itself.
 */
export type AsyncSelectSource = {
  query: string;
  onQueryChange: (query: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  hasMore?: boolean;
  onEndReached?: () => void;
};

type SelectModalProps<T> = SelectSource<T> & {
  visible: boolean;
  onClose: () => void;
  selectedKey?: string;
  onSelect: (key: string) => void;
  /** When provided together with `onClear`, shows a row to clear the selection. */
  clearLabel?: string;
  onClear?: () => void;
  async?: AsyncSelectSource;
};

export function SelectModal<T>({
  visible,
  onClose,
  items,
  getKey,
  getLabel,
  getSublabel,
  matches,
  selectedKey,
  onSelect,
  title,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  onClear,
  async,
}: SelectModalProps<T>) {
  const [localQuery, setLocalQuery] = useState('');
  const query = async ? async.query : localQuery;
  const setQuery = async ? async.onQueryChange : setLocalQuery;

  // Async mode's isLoading/isError toggle on every keystroke, so its list needs a fixed
  // height (see `AsyncListArea`) to avoid reflowing the sheet; sync mode never changes
  // state mid-filter, so it keeps the old content-hugging `maxHeight`.
  const asyncListHeight = useResponsiveListHeight();

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    // Only reset when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    if (async || !matches) return items;
    const q = query.trim();
    if (!q) return items;
    return items.filter((item) => matches(item, q));
  }, [items, matches, query, async]);

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const key = getKey(item);
      const sublabel = getSublabel?.(item);
      return (
        <Pressable
          onPress={() => {
            onSelect(key);
            onClose();
          }}>
          <ThemedView type={selectedKey === key ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
            <ThemedText style={styles.rowTitle}>{getLabel(item)}</ThemedText>
            {sublabel && (
              <ThemedText type="small" themeColor="textSecondary">
                {sublabel}
              </ThemedText>
            )}
          </ThemedView>
        </Pressable>
      );
    },
    [getKey, getLabel, getSublabel, onClose, onSelect, selectedKey],
  );

  const handleEndReached = useCallback(() => {
    async?.onEndReached?.();
  }, [async]);

  return (
    <FormSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.body}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder} />

        <AsyncListArea
          isLoading={!!async?.isLoading}
          isError={!!async?.isError}
          style={async ? { height: asyncListHeight } : undefined}>
          <FlatList
            style={async ? styles.flatListFill : styles.list}
            data={filtered}
            keyExtractor={getKey}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              clearLabel && onClear ? (
                <Pressable
                  onPress={() => {
                    onClear();
                    onClose();
                  }}>
                  <ThemedView type={!selectedKey ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
                    <ThemedText style={styles.rowTitle}>{clearLabel}</ThemedText>
                  </ThemedView>
                </Pressable>
              ) : null
            }
            ListFooterComponent={async?.hasMore ? <ActivityIndicator style={styles.loading} /> : null}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {emptyLabel}
              </ThemedText>
            }
          />
        </AsyncListArea>
      </View>
    </FormSheet>
  );
}

/** Labeled form field whose value opens a `SelectModal`. For required picks in forms. */
export function SelectField<T>({
  label,
  placeholder = 'בחירה',
  async,
  selectedItem,
  ...source
}: SelectSource<T> & {
  label: string;
  placeholder?: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
  async?: AsyncSelectSource;
  /** Overrides the trigger's displayed item — needed when `items` doesn't necessarily
   * contain the current selection (e.g. `async` mode, where `items` is just the latest
   * search page). */
  selectedItem?: T;
}) {
  const [visible, setVisible] = useState(false);
  const selected = selectedItem ?? source.items.find((item) => source.getKey(item) === source.selectedKey);

  return (
    <Field label={label}>
      <Pressable onPress={() => setVisible(true)}>
        <ThemedView type="backgroundElement" style={styles.trigger}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'} style={styles.triggerText}>
            {selected ? source.getLabel(selected) : placeholder}
          </ThemedText>
        </ThemedView>
      </Pressable>
      <SelectModal {...source} async={async} visible={visible} onClose={() => setVisible(false)} />
    </Field>
  );
}

/** Chip-style trigger for filter bars. Shows the selected label (or `clearLabel`) and
 * reports `undefined` when the clear row is picked. */
export function SelectFilterChip<T>({
  clearLabel,
  onChange,
  async,
  selectedItem,
  ...source
}: SelectSource<T> & {
  selectedKey: string | undefined;
  onChange: (key: string | undefined) => void;
  clearLabel: string;
  async?: AsyncSelectSource;
  selectedItem?: T;
}) {
  const [visible, setVisible] = useState(false);
  const selected = selectedItem ?? source.items.find((item) => source.getKey(item) === source.selectedKey);

  return (
    <>
      <FilterChip
        label={selected ? source.getLabel(selected) : clearLabel}
        selected={!!selected}
        onPress={() => setVisible(true)}
      />
      <SelectModal
        {...source}
        async={async}
        visible={visible}
        onClose={() => setVisible(false)}
        onSelect={onChange}
        clearLabel={clearLabel}
        onClear={() => onChange(undefined)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  loading: {
    padding: Spacing.four,
  },
  list: {
    maxHeight: 400,
  },
  flatListFill: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    padding: Spacing.three,
  },
  trigger: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  triggerText: {
    textAlign: rtlTextAlign.start,
  },
});
