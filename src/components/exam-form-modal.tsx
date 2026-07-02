import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { CourseSelectField } from '@/components/course-select-modal';
import { DateField } from '@/components/date-field';
import { TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { Spacing } from '@/constants/theme';
import { examsCollection, useCourses } from '@/data/store';
import type { Exam } from '@/data/types';

/** Parse a numeric text field; empty or invalid → undefined. */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ExamFormModal({
  visible,
  onClose,
  initialCourseId,
  exam,
}: {
  visible: boolean;
  onClose: () => void;
  initialCourseId?: string;
  exam?: Exam;
}) {
  const courses = useCourses();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [grade, setGrade] = useState('');

  // Reset from props each time the sheet opens (create vs. edit).
  useEffect(() => {
    if (!visible) return;
    if (exam) {
      setTitle(exam.title);
      setCourseId(exam.courseId);
      setDate(exam.date);
      setGrade(exam.grade !== undefined ? String(exam.grade) : '');
    } else {
      const startCourseId = initialCourseId ?? '';
      const startCourse = courses.find((c) => c.id === startCourseId);
      setTitle(startCourse?.name ?? '');
      setCourseId(startCourseId);
      setDate('');
      setGrade('');
    }
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('שגיאה', 'אנא הזינו כותרת');
      return;
    }
    if (!courseId) {
      Alert.alert('שגיאה', 'אנא בחרו קורס');
      return;
    }
    if (!date) {
      Alert.alert('שגיאה', 'אנא בחרו תאריך');
      return;
    }

    const payload: Exam = {
      id: exam?.id ?? `e-${Date.now()}`,
      title: trimmedTitle,
      courseId,
      date,
      grade: toNumber(grade),
    };

    if (exam) {
      examsCollection.update(exam.id, payload);
    } else {
      examsCollection.add(payload);
    }
    onClose();
  }

  function handleDelete() {
    if (!exam) return;
    Alert.alert('מחיקת מבחן', `למחוק את "${exam.title}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => {
          examsCollection.remove(exam.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={exam ? 'עריכת מבחן' : 'מבחן חדש'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <TextField label="כותרת" value={title} onChangeText={setTitle} placeholder="מבחן סופי" />
        <CourseSelectField label="קורס" courses={courses} selectedCourseId={courseId || undefined} onSelect={setCourseId} />
        <DateField label="תאריך" value={date || undefined} onChange={setDate} />
        <TextField
          label="ציון (אופציונלי)"
          value={grade}
          onChangeText={setGrade}
          keyboardType="number-pad"
          placeholder="95"
        />

        <SheetButton label={exam ? 'שמירה' : 'הוספה'} onPress={handleSave} />
        {exam ? <SheetButton label="מחיקה" variant="destructive" onPress={handleDelete} /> : null}
      </ScrollView>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
});
