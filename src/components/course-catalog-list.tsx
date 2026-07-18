import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedTextInput } from '@/components/form-fields';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_CATALOG, isEnrolled, type CourseCatalogEntry } from '@/data/catalog';
import { useCourses } from '@/data/store';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Search + multi-select catalog list, shared by `CourseCatalogPicker` (in-app modal) and
 * the onboarding course-selection step. Already-enrolled courses render checked and
 * disabled; the caller owns the in-progress `selected` set and what happens on continue.
 */
export function CourseCatalogList({
  selected,
  onToggle,
  style,
  listStyle,
}: {
  selected: Set<string>;
  onToggle: (entry: CourseCatalogEntry) => void;
  /** Style for the root container — pass `{ flex: 1 }` when the list should fill
   * remaining space (e.g. a full-screen host); left unset keeps the default
   * content-sized behavior the bottom-sheet modal relies on. */
  style?: StyleProp<ViewStyle>;
  listStyle?: StyleProp<ViewStyle>;
}) {
  const courses = useCourses();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return COURSE_CATALOG;
    return COURSE_CATALOG.filter((entry) => entry.name.includes(q) || entry.courseNumber.includes(q));
  }, [query]);

  return (
    <View style={[styles.body, style]}>
      <ThemedTextInput value={query} onChangeText={setQuery} placeholder="חיפוש לפי שם או מספר קורס" />

      <ScrollView style={listStyle} contentContainerStyle={styles.listContent}>
        {filtered.map((entry) => {
          const enrolled = isEnrolled(entry.courseNumber, courses);
          const checked = enrolled || selected.has(entry.courseNumber);
          const press = () => {
            if (!enrolled) onToggle(entry);
          };
          return (
            <Pressable key={entry.courseNumber} onPress={press} disabled={enrolled}>
              <ThemedView
                type="backgroundElement"
                className="border border-border"
                style={[styles.row, enrolled && styles.rowDisabled]}>
                <TaskCheckbox checked={checked} onToggle={press} />
                <View style={styles.rowMain}>
                  <ThemedText style={styles.rowTitle}>{entry.name}</ThemedText>
                  <ThemedText style={styles.rowSubtitle} type="small" themeColor="textSecondary">
                    {[entry.courseNumber, entry.faculty].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          );
        })}
        {filtered.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            לא נמצאו קורסים
          </ThemedText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
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
