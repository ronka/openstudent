import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { FormSheet, SheetButton } from '@/components/form-sheet';
import { SharedDeadlinesOffer } from '@/components/shared-deadlines-offer';
import { buildAssignmentPayloads, buildPendingTasks, QuickTasksForm, type PendingTask } from '@/components/quick-tasks-form';
import { Spacing } from '@/constants/theme';
import { contributeAssignmentDeadline } from '@/data/shared-deadlines-api';
import { buildAssignmentsFromShared } from '@/data/shared-deadlines';
import { assignmentsCollection, useAssignmentsByCourse, useCourse } from '@/data/store';

export function QuickTasksModal({
  visible,
  courseId,
  courseName,
  onClose,
}: {
  visible: boolean;
  courseId: string;
  courseName: string;
  onClose: () => void;
}) {
  const course = useCourse(courseId);
  const existing = useAssignmentsByCourse(courseId);
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [mamanCount, setMamanCount] = useState(0);
  const [mamachCount, setMamachCount] = useState(0);
  const [pending, setPending] = useState<PendingTask[]>([]);

  // Reset to the initial step/counts each time the sheet (re)opens. Writing state from
  // this effect is deliberate — the sheet stays mounted across opens, so useState
  // initializers won't re-run; the set-state-in-effect rule doesn't model this pattern.
  useEffect(() => {
    if (!visible) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setStep('select');
    setMamanCount(0);
    setMamachCount(0);
    setPending([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [visible]);

  const total = mamanCount + mamachCount;

  function goToReview() {
    setPending(buildPendingTasks(mamanCount, mamachCount));
    setStep('review');
  }

  function setPendingDueDate(index: number, dueDate: string) {
    setPending((prev) => prev.map((task, i) => (i === index ? { ...task, dueDate } : task)));
  }

  function handleCreate() {
    const created = buildAssignmentPayloads(courseId, pending);
    assignmentsCollection.addMany(created);
    // Share only dates the student typed in — not the placeholder default.
    if (course) {
      pending.forEach((task, index) => {
        if (task.dueDate.trim()) void contributeAssignmentDeadline(course, created[index]);
      });
    }
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={`מטלות ל${courseName}`}>
      {step === 'select' ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          {course?.courseNumber && (
            <SharedDeadlinesOffer
              course={course}
              existing={existing}
              onAccept={(items) => {
                assignmentsCollection.addMany(buildAssignmentsFromShared(courseId, items));
                onClose();
              }}
            />
          )}
          <QuickTasksForm
            step="select"
            mamanCount={mamanCount}
            mamachCount={mamachCount}
            onMamanCountChange={setMamanCount}
            onMamachCountChange={setMamachCount}
            pending={pending}
            onPendingDueDateChange={setPendingDueDate}
          />
          <SheetButton label="המשך" onPress={goToReview} disabled={total === 0} />
          <SheetButton label="דלג" variant="ghost" onPress={onClose} />
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <QuickTasksForm
            step="review"
            mamanCount={mamanCount}
            mamachCount={mamachCount}
            onMamanCountChange={setMamanCount}
            onMamachCountChange={setMamachCount}
            pending={pending}
            onPendingDueDateChange={setPendingDueDate}
          />
          <SheetButton label={`צור ${pending.length} מטלות`} onPress={handleCreate} />
          <SheetButton label="חזרה" variant="ghost" onPress={() => setStep('select')} />
        </ScrollView>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
});
