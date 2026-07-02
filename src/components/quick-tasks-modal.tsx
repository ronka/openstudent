import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ChipField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_NUMBER_RANGE, getAssignmentName } from '@/data/constants';
import { assignmentsCollection } from '@/data/store';
import type { AssignmentType } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const COUNT_OPTIONS = Array.from({ length: 10 }, (_, index) => index); // 0–9
const DAY_MS = 24 * 60 * 60 * 1000;

interface PendingTask {
  type: AssignmentType;
  number: number;
  dueDate: string;
}

/** Sequential numbers from the type's range start, e.g. count 3 for MAMAN → [11, 12, 13]. */
function buildPending(type: AssignmentType, count: number): PendingTask[] {
  const [start] = ASSIGNMENT_NUMBER_RANGE[type];
  return Array.from({ length: count }, (_, index) => ({ type, number: start + index, dueDate: '' }));
}

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

  useEffect(() => {
    if (!visible) return;
    setStep('select');
    setMamanCount(0);
    setMamachCount(0);
    setPending([]);
  }, [visible]);

  const total = mamanCount + mamachCount;

  function goToReview() {
    setPending([...buildPending('MAMAN', mamanCount), ...buildPending('MAMACH', mamachCount)]);
    setStep('review');
  }

  function setPendingDueDate(index: number, dueDate: string) {
    setPending((prev) => prev.map((task, i) => (i === index ? { ...task, dueDate } : task)));
  }

  function handleCreate() {
    const now = Date.now();
    assignmentsCollection.addMany(
      pending.map((task, index) => ({
        id: `${courseId}-${task.type}-${task.number}-${now}-${index}`,
        name: getAssignmentName(task.type, task.number),
        courseId,
        type: task.type,
        taskNumber: task.number,
        status: 'todo',
        dueDate: task.dueDate.trim() || new Date(now + 30 * DAY_MS).toISOString().slice(0, 10),
        materialIds: [],
      }))
    );
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={`מטלות ל${courseName}`}>
      {step === 'select' ? (
        <View style={styles.body}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            כמה מטלות ליצור? (המספרים יוקצו אוטומטית)
          </ThemedText>

          <ChipField
            label="ממ״נ"
            scroll
            options={COUNT_OPTIONS}
            getLabel={String}
            isSelected={(count) => mamanCount === count}
            onSelect={setMamanCount}
          />
          <ChipField
            label="ממ״ח"
            scroll
            options={COUNT_OPTIONS}
            getLabel={String}
            isSelected={(count) => mamachCount === count}
            onSelect={setMamachCount}
          />

          <SheetButton label="המשך" onPress={goToReview} disabled={total === 0} />
          <SheetButton label="דלג" variant="ghost" onPress={onClose} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            הגדירו תאריך יעד לכל מטלה (ריק → 30 יום מהיום)
          </ThemedText>

          {pending.map((task, index) => (
            <View key={`${task.type}-${task.number}`} style={styles.reviewRow}>
              <ThemedText style={styles.reviewName}>{getAssignmentName(task.type, task.number)}</ThemedText>
              <DateField
                value={task.dueDate || undefined}
                onChange={(value) => setPendingDueDate(index, value)}
                style={styles.input}
              />
            </View>
          ))}

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
  hint: {
    textAlign: rtlTextAlign.start,
  },
  reviewRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  reviewName: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
  input: {
    flex: 1,
  },
});
