import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FormSheet, SheetButton } from '@/components/form-sheet';
import { buildAssignmentPayloads, buildPendingTasks, QuickTasksForm, type PendingTask } from '@/components/quick-tasks-form';
import { Spacing } from '@/constants/theme';
import { assignmentsCollection } from '@/data/store';

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
    assignmentsCollection.addMany(buildAssignmentPayloads(courseId, pending));
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={`מטלות ל${courseName}`}>
      {step === 'select' ? (
        <View style={styles.body}>
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
        </View>
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
