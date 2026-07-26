import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { CourseSelectField } from '@/components/course-select-modal';
import { DateField } from '@/components/date-field';
import { ChipField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPES, assignmentNumbers, getAssignmentName } from '@/data/constants';
import { assignmentsCollection, useAssignments, useCourses } from '@/data/store';
import type { Assignment, AssignmentType } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlTextAlign } from '@/utils/rtl';

/** First task number in the type's range not yet used by that course. */
function nextAvailableNumber(
  assignments: Assignment[],
  courseId: string,
  type: AssignmentType,
  ignoreId?: string
): number {
  const used = new Set(
    assignments
      .filter((a) => a.courseId === courseId && a.type === type && a.id !== ignoreId)
      .map((a) => a.taskNumber)
  );
  const numbers = assignmentNumbers(type);
  return numbers.find((n) => !used.has(n)) ?? numbers[0];
}

export function AssignmentFormModal({
  visible,
  onClose,
  initialCourseId,
  assignment,
}: {
  visible: boolean;
  onClose: () => void;
  initialCourseId?: string;
  assignment?: Assignment;
}) {
  const courses = useCourses();
  const assignments = useAssignments();

  const [type, setType] = useState<AssignmentType>('MAMAN');
  const [taskNumber, setTaskNumber] = useState<number>(11);
  const [courseId, setCourseId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');

  // Reset from props each time the sheet opens (create vs. edit).
  useEffect(() => {
    if (!visible) return;
    // Writing state from this effect is deliberate — the sheet stays mounted across
    // opens, so useState initializers won't re-run; the rule doesn't model this reset.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (assignment) {
      setType(assignment.type);
      setTaskNumber(assignment.taskNumber);
      setCourseId(assignment.courseId);
      setDueDate(assignment.dueDate ?? '');
    } else {
      const startCourse = initialCourseId ?? '';
      setType('MAMAN');
      setTaskNumber(startCourse ? nextAvailableNumber(assignments, startCourse, 'MAMAN') : 11);
      setCourseId(startCourse);
      setDueDate('');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const numbers = useMemo(() => assignmentNumbers(type), [type]);

  function handleTypeChange(nextType: AssignmentType) {
    setType(nextType);
    setTaskNumber(nextAvailableNumber(assignments, courseId, nextType, assignment?.id));
  }

  function handleCourseChange(nextCourseId: string) {
    setCourseId(nextCourseId);
    if (!assignment) {
      setTaskNumber(nextAvailableNumber(assignments, nextCourseId, type));
    }
  }

  function handleSave() {
    if (!courseId) {
      Alert.alert('שגיאה', 'אנא בחרו קורס');
      return;
    }

    const payload: Assignment = {
      id: assignment?.id ?? `a-${Date.now()}`,
      name: getAssignmentName(type, taskNumber),
      courseId,
      type,
      taskNumber,
      status: assignment?.status ?? 'todo',
      dueDate: dueDate.trim() || undefined,
    };

    if (assignment) {
      assignmentsCollection.update(assignment.id, payload);
      posthog.capture('assignment_updated', { assignment_id: assignment.id, course_id: courseId, type });
    } else {
      assignmentsCollection.add(payload);
      posthog.capture('assignment_created', {
        assignment_id: payload.id,
        course_id: courseId,
        type,
        has_due_date: !!payload.dueDate,
      });
    }
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={assignment ? 'עריכת מטלה' : 'מטלה חדשה'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <ChipField
          label="סוג משימה"
          options={ASSIGNMENT_TYPES}
          getLabel={(option) => ASSIGNMENT_TYPE_LABELS[option]}
          isSelected={(option) => type === option}
          onSelect={handleTypeChange}
        />
        <ChipField
          label="מספר משימה"
          scroll
          options={numbers}
          getLabel={String}
          isSelected={(n) => taskNumber === n}
          onSelect={setTaskNumber}
        />
        <CourseSelectField
          label="קורס"
          courses={courses}
          selectedCourseId={courseId || undefined}
          onSelect={handleCourseChange}
        />
        <DateField label="תאריך יעד (אופציונלי)" value={dueDate || undefined} onChange={setDueDate} optional />

        <ThemedText type="small" themeColor="textSecondary" style={styles.preview}>
          {getAssignmentName(type, taskNumber)}
        </ThemedText>

        <SheetButton label={assignment ? 'שמירה' : 'הוספה'} onPress={handleSave} />
      </ScrollView>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  preview: {
    textAlign: rtlTextAlign.start,
  },
});
