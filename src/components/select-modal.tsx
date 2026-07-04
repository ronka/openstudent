import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  matches: (item: T, query: string) => boolean;
  title: string;
  searchPlaceholder?: string;
  emptyLabel: string;
};

type SelectModalProps<T> = SelectSource<T> & {
  visible: boolean;
  onClose: () => void;
  selectedKey?: string;
  onSelect: (key: string) => void;
  /** When provided together with `onClear`, shows a row to clear the selection. */
  clearLabel?: string;
  onClear?: () => void;
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
}: SelectModalProps<T>) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    // Only reset when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((item) => matches(item, q));
  }, [items, matches, query]);

  return (
    <FormSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.body}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder} />

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          {clearLabel && onClear && (
            <Pressable
              onPress={() => {
                onClear();
                onClose();
              }}>
              <ThemedView type={!selectedKey ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
                <ThemedText style={styles.rowTitle}>{clearLabel}</ThemedText>
              </ThemedView>
            </Pressable>
          )}
          {filtered.map((item) => {
            const key = getKey(item);
            const sublabel = getSublabel?.(item);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  onSelect(key);
                  onClose();
                }}>
                <ThemedView
                  type={selectedKey === key ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.row}>
                  <ThemedText style={styles.rowTitle}>{getLabel(item)}</ThemedText>
                  {sublabel && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {sublabel}
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            );
          })}
          {filtered.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              {emptyLabel}
            </ThemedText>
          )}
        </ScrollView>
      </View>
    </FormSheet>
  );
}

/** Labeled form field whose value opens a `SelectModal`. For required picks in forms. */
export function SelectField<T>({
  label,
  placeholder = 'בחירה',
  ...source
}: SelectSource<T> & {
  label: string;
  placeholder?: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selected = source.items.find((item) => source.getKey(item) === source.selectedKey);

  return (
    <Field label={label}>
      <Pressable onPress={() => setVisible(true)}>
        <ThemedView type="backgroundElement" style={styles.trigger}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'} style={styles.triggerText}>
            {selected ? source.getLabel(selected) : placeholder}
          </ThemedText>
        </ThemedView>
      </Pressable>
      <SelectModal {...source} visible={visible} onClose={() => setVisible(false)} />
    </Field>
  );
}

/** Chip-style trigger for filter bars. Shows the selected label (or `clearLabel`) and
 * reports `undefined` when the clear row is picked. */
export function SelectFilterChip<T>({
  clearLabel,
  onChange,
  ...source
}: SelectSource<T> & {
  selectedKey: string | undefined;
  onChange: (key: string | undefined) => void;
  clearLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = source.items.find((item) => source.getKey(item) === source.selectedKey);

  return (
    <>
      <FilterChip
        label={selected ? source.getLabel(selected) : clearLabel}
        selected={!!selected}
        onPress={() => setVisible(true)}
      />
      <SelectModal
        {...source}
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
  list: {
    maxHeight: 400,
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
