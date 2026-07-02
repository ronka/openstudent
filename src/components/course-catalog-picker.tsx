import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChipField, ThemedTextInput } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { catalogEntryByNumber, COURSE_CATALOG, isEnrolled, type CourseCatalogEntry } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import { coursesCollection, useCourses } from '@/data/store';
import type { Course, Semester } from '@/data/types';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

export function CourseCatalogPicker({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after courses are created, with the new course ids/names (e.g. to launch Quick Tasks). */
  onAdded: (created: { id: string; name: string }[]) => void;
}) {
  const courses = useCourses();
  const current = useMemo(() => getCurrentSemester(), []);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelected(new Set());
    setYear(current.year);
    setSemester(current.term);
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return COURSE_CATALOG;
    return COURSE_CATALOG.filter((entry) => entry.name.includes(q) || entry.courseNumber.includes(q));
  }, [query]);

  function toggle(entry: CourseCatalogEntry) {
    if (isEnrolled(entry.courseNumber, courses)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entry.courseNumber)) next.delete(entry.courseNumber);
      else next.add(entry.courseNumber);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    const now = Date.now();
    const created = Array.from(selected).map((courseNumber, index) => {
      const entry = catalogEntryByNumber(courseNumber)!;
      const course: Course = {
        id: `c-${now}-${index}`,
        name: entry.name,
        courseNumber: entry.courseNumber,
        faculty: entry.faculty,
        credits: entry.credits,
        type: entry.type,
        level: entry.level,
        status: deriveCourseStatus({ year, semester, grade: undefined }, current),
        year,
        semester,
      };
      coursesCollection.add(course);
      return { id: course.id, name: course.name };
    });
    onAdded(created);
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="הוספת קורסים">
      <View style={styles.body}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="חיפוש לפי שם או מספר קורס" />

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.map((entry) => {
            const enrolled = isEnrolled(entry.courseNumber, courses);
            const checked = enrolled || selected.has(entry.courseNumber);
            return (
              <Pressable key={entry.courseNumber} onPress={() => toggle(entry)} disabled={enrolled}>
                <ThemedView type="backgroundElement" style={[styles.row, enrolled && styles.rowDisabled]}>
                  <View style={styles.checkboxWrap}>
                    <TaskCheckbox checked={checked} onToggle={() => toggle(entry)} />
                  </View>
                  <View style={styles.rowMain}>
                    <ThemedText style={styles.rowTitle}>{entry.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
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

        <ChipField
          label="סמסטר"
          options={SEMESTERS}
          getLabel={(option) => option}
          isSelected={(option) => semester === option}
          onSelect={setSemester}
        />
        <ChipField
          label="שנה"
          scroll
          options={YEAR_OPTIONS}
          getLabel={String}
          isSelected={(option) => year === option}
          onSelect={setYear}
        />

        <SheetButton
          label={selected.size > 0 ? `הוספת ${selected.size} קורסים` : 'בחרו קורסים להוספה'}
          onPress={handleAdd}
          disabled={selected.size === 0}
        />
      </View>
    </FormSheet>
  );
}

// A handful of years around "now" — enough range for planning ahead/behind.
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => getCurrentSemester().year - 2 + index);

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  checkboxWrap: {
    ...rtlMargin.marginEnd(Spacing.three),
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    padding: Spacing.three,
  },
});
