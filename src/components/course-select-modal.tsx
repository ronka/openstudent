import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { Field, ThemedTextInput } from '@/components/form-fields';
import { FormSheet } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Course } from '@/data/types';
import { rtlTextAlign } from '@/utils/rtl';

/**
 * Searchable full-list course picker. Used wherever a single course needs to be chosen
 * from a list that can grow too large for chips (search matches name or course number).
 */
export function CourseSelectModal({
  visible,
  onClose,
  courses,
  selectedCourseId,
  onSelect,
  title = 'בחירת קורס',
  clearLabel,
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  courses: Course[];
  selectedCourseId?: string;
  onSelect: (courseId: string) => void;
  title?: string;
  /** When provided together with `onClear`, shows a row to clear the selection instead of picking a course. */
  clearLabel?: string;
  onClear?: () => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    // Only reset when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return courses;
    return courses.filter((course) => course.name.includes(q) || course.courseNumber?.includes(q));
  }, [courses, query]);

  return (
    <FormSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.body}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="חיפוש לפי שם או מספר קורס" />

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          {clearLabel && onClear && (
            <Pressable
              onPress={() => {
                onClear();
                onClose();
              }}>
              <ThemedView type={!selectedCourseId ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
                <ThemedText style={styles.rowTitle}>{clearLabel}</ThemedText>
              </ThemedView>
            </Pressable>
          )}
          {filtered.map((course) => (
            <Pressable
              key={course.id}
              onPress={() => {
                onSelect(course.id);
                onClose();
              }}>
              <ThemedView
                type={selectedCourseId === course.id ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.row}>
                <ThemedText style={styles.rowTitle}>{course.name}</ThemedText>
                {course.courseNumber && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {course.courseNumber}
                  </ThemedText>
                )}
              </ThemedView>
            </Pressable>
          ))}
          {filtered.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              לא נמצאו קורסים
            </ThemedText>
          )}
        </ScrollView>
      </View>
    </FormSheet>
  );
}

/** Labeled form field whose value opens `CourseSelectModal`. For required course pickers in forms. */
export function CourseSelectField({
  label,
  courses,
  selectedCourseId,
  onSelect,
  placeholder = 'בחרו קורס',
}: {
  label: string;
  courses: Course[];
  selectedCourseId?: string;
  onSelect: (courseId: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = courses.find((course) => course.id === selectedCourseId);

  return (
    <Field label={label}>
      <Pressable onPress={() => setVisible(true)}>
        <ThemedView type="backgroundElement" style={styles.trigger}>
          <ThemedText themeColor={selected ? 'text' : 'textSecondary'} style={styles.triggerText}>
            {selected?.name ?? placeholder}
          </ThemedText>
        </ThemedView>
      </Pressable>
      <CourseSelectModal
        visible={visible}
        onClose={() => setVisible(false)}
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelect={onSelect}
      />
    </Field>
  );
}

/** Chip-style trigger for filter bars: shows the selected course's name (or `clearLabel`)
 * and opens `CourseSelectModal` on tap. Picking the clear row reports `undefined`. */
export function CourseFilterChip({
  courses,
  selectedCourseId,
  onChange,
  clearLabel,
}: {
  courses: Course[];
  selectedCourseId: string | undefined;
  onChange: (courseId: string | undefined) => void;
  clearLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = courses.find((course) => course.id === selectedCourseId);

  return (
    <>
      <FilterChip label={selected?.name ?? clearLabel} selected={!!selected} onPress={() => setVisible(true)} />
      <CourseSelectModal
        visible={visible}
        onClose={() => setVisible(false)}
        courses={courses}
        selectedCourseId={selectedCourseId}
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
