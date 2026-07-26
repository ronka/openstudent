import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChipField, SwitchField, TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { COURSE_LEVEL_LABELS, COURSE_STATUS_LABELS, COURSE_STATUSES, SEMESTERS } from '@/data/constants';
import { coursesCollection } from '@/data/store';
import type { Course, CourseStatus, Semester } from '@/data/types';
import { posthog } from '@/utils/analytics';
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
 * only status/year/semester/grade/notes can change. Status is edited as a manual
 * override here (same as the status badge on the detail screen); "אוטומטי" clears
 * the override so status reverts to auto-derivation from year/semester/grade.
 */

/** Status selection in the form: an explicit override, or 'auto' to clear it. */
type StatusChoice = CourseStatus | 'auto';
const STATUS_CHOICES: StatusChoice[] = ['auto', ...COURSE_STATUSES];
const STATUS_CHOICE_LABELS: Record<StatusChoice, string> = { auto: 'אוטומטי', ...COURSE_STATUS_LABELS };
export function CourseFormModal({ visible, onClose, course }: { visible: boolean; onClose: () => void; course: Course }) {
  const [status, setStatus] = useState<StatusChoice>('auto');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState<Semester | undefined>(undefined);
  const [grade, setGrade] = useState('');
  const [binaryPass, setBinaryPass] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset from props each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    // Writing state from this effect is deliberate — the sheet stays mounted across
    // opens, so useState initializers won't re-run; the rule doesn't model this reset.
    /* eslint-disable react-hooks/set-state-in-effect */
    setStatus(course.statusOverride ?? 'auto');
    setYear(course.year !== undefined ? String(course.year) : '');
    setSemester(course.semester);
    setGrade(course.grade !== undefined ? String(course.grade) : '');
    setBinaryPass(course.binaryPass ?? false);
    setNotes(course.notes ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, course.id]);

  function handleSave() {
    coursesCollection.update(course.id, {
      statusOverride: status === 'auto' ? undefined : status,
      year: toNumber(year),
      semester,
      grade: toNumber(grade),
      binaryPass: binaryPass || undefined,
      notes: notes.trim() || undefined,
    });
    posthog.capture('course_updated', { course_id: course.id, binary_pass: binaryPass });
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="עריכת קורס">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
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
          label="סטטוס"
          options={STATUS_CHOICES}
          getLabel={(option) => STATUS_CHOICE_LABELS[option]}
          isSelected={(option) => status === option}
          onSelect={setStatus}
        />

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

        <SwitchField
          label="עובר בינארי"
          hint="הקורס נחשב כקורס שעברת, אך הציון לא נכלל בחישוב הממוצע"
          value={binaryPass}
          onValueChange={setBinaryPass}
        />

        <TextField label="הערות (אופציונלי)" value={notes} onChangeText={setNotes} placeholder="הערות" />

        <SheetButton label="שמירה" onPress={handleSave} />
      </ScrollView>
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
