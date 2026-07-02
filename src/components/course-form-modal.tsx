import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipField, TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { COURSE_LEVEL_LABELS, SEMESTERS } from '@/data/constants';
import { coursesCollection } from '@/data/store';
import type { Course, Semester } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/** Parse a numeric text field; empty or invalid → undefined. */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Edit-only sheet for an existing (catalog-created) course. Identity fields
 * (name/number/faculty/credits/type/level) are catalog-owned and shown read-only;
 * only year/semester/grade/notes can change. Status is never edited — it's derived.
 */
export function CourseFormModal({ visible, onClose, course }: { visible: boolean; onClose: () => void; course: Course }) {
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState<Semester | undefined>(undefined);
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');

  // Reset from props each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setYear(course.year !== undefined ? String(course.year) : '');
    setSemester(course.semester);
    setGrade(course.grade !== undefined ? String(course.grade) : '');
    setNotes(course.notes ?? '');
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, course.id]);

  function handleSave() {
    coursesCollection.update(course.id, {
      year: toNumber(year),
      semester,
      grade: toNumber(grade),
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="עריכת קורס">
      <View style={styles.body}>
        <View style={styles.identity}>
          <ThemedText style={styles.name}>{course.name}</ThemedText>
          <View style={styles.metaRow}>
            {course.courseNumber && (
              <ThemedText type="small" themeColor="textSecondary">
                {course.courseNumber}
              </ThemedText>
            )}
            {course.faculty && (
              <ThemedText type="small" themeColor="textSecondary">
                {course.faculty}
              </ThemedText>
            )}
            {course.credits !== undefined && (
              <ThemedText type="small" themeColor="textSecondary">
                {course.credits} נ&quot;ז
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {course.type}
            </ThemedText>
            {course.level && (
              <ThemedText type="small" themeColor="textSecondary">
                {COURSE_LEVEL_LABELS[course.level]}
              </ThemedText>
            )}
          </View>
        </View>

        <ChipField
          label="סמסטר"
          options={SEMESTERS}
          getLabel={(option) => option}
          isSelected={(option) => semester === option}
          onSelect={(option) => setSemester(semester === option ? undefined : option)}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <TextField label="שנה" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2024" />
          </View>
          <View style={styles.rowField}>
            <TextField
              label="ציון (אופציונלי)"
              value={grade}
              onChangeText={setGrade}
              keyboardType="number-pad"
              placeholder="90"
            />
          </View>
        </View>

        <TextField label="הערות (אופציונלי)" value={notes} onChangeText={setNotes} placeholder="הערות" />

        <SheetButton label="שמירה" onPress={handleSave} />
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  identity: {
    gap: Spacing.two,
  },
  name: {
    textAlign: rtlTextAlign.start,
  },
  metaRow: {
    flexDirection: rtlFlexDirection.row,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rowFields: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.three,
  },
  rowField: {
    flex: 1,
  },
});
