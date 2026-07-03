import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ChipField } from '@/components/form-fields';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_NUMBER_RANGE, getAssignmentName } from '@/data/constants';
import type { Assignment, AssignmentType } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export const TASK_COUNT_OPTIONS = Array.from({ length: 10 }, (_, index) => index); // 0–9
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PendingTask {
  type: AssignmentType;
  number: number;
  dueDate: string;
}

/** Sequential numbers from each type's range start, e.g. maman count 3 → [11, 12, 13]. */
export function buildPendingTasks(mamanCount: number, mamachCount: number): PendingTask[] {
  function build(type: AssignmentType, count: number): PendingTask[] {
    const [start] = ASSIGNMENT_NUMBER_RANGE[type];
    return Array.from({ length: count }, (_, index) => ({ type, number: start + index, dueDate: '' }));
  }
  return [...build('MAMAN', mamanCount), ...build('MAMACH', mamachCount)];
}

/** 'YYYY-MM-DD' 30 days from `now`, the shared empty-due-date fallback. */
export function defaultDueDate(now: number = Date.now()): string {
  return new Date(now + 30 * DAY_MS).toISOString().slice(0, 10);
}

/** Build the final `Assignment` rows for `assignmentsCollection.addMany`. */
export function buildAssignmentPayloads(courseId: string, pending: PendingTask[], now: number = Date.now()): Assignment[] {
  return pending.map((task, index) => ({
    id: `${courseId}-${task.type}-${task.number}-${now}-${index}`,
    name: getAssignmentName(task.type, task.number),
    courseId,
    type: task.type,
    taskNumber: task.number,
    status: 'todo',
    dueDate: task.dueDate.trim() || defaultDueDate(now),
  }));
}

/**
 * Shared ממ״נ/ממ״ח count-and-due-date fields, used by `QuickTasksModal` (one step
 * visible at a time, behind its own buttons) and the onboarding per-course loop (both
 * steps stacked on one screen). Renders no wrapper/buttons — callers own layout and
 * actions so each host can compose it differently.
 */
export function QuickTasksForm({
  step,
  mamanCount,
  mamachCount,
  onMamanCountChange,
  onMamachCountChange,
  pending,
  onPendingDueDateChange,
}: {
  step: 'select' | 'review';
  mamanCount: number;
  mamachCount: number;
  onMamanCountChange: (count: number) => void;
  onMamachCountChange: (count: number) => void;
  pending: PendingTask[];
  onPendingDueDateChange: (index: number, dueDate: string) => void;
}) {
  if (step === 'select') {
    return (
      <Fragment>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          כמה מטלות ליצור? (המספרים יוקצו אוטומטית)
        </ThemedText>
        <ChipField
          label="ממ״נ"
          scroll
          options={TASK_COUNT_OPTIONS}
          getLabel={String}
          isSelected={(count) => mamanCount === count}
          onSelect={onMamanCountChange}
        />
        <ChipField
          label="ממ״ח"
          scroll
          options={TASK_COUNT_OPTIONS}
          getLabel={String}
          isSelected={(count) => mamachCount === count}
          onSelect={onMamachCountChange}
        />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        הגדירו תאריך יעד לכל מטלה (ריק → 30 יום מהיום)
      </ThemedText>
      {pending.map((task, index) => (
        <View key={`${task.type}-${task.number}`} style={styles.reviewRow}>
          <ThemedText style={styles.reviewName}>{getAssignmentName(task.type, task.number)}</ThemedText>
          <DateField value={task.dueDate || undefined} onChange={(value) => onPendingDueDateChange(index, value)} style={styles.input} />
        </View>
      ))}
    </Fragment>
  );
}

const styles = StyleSheet.create({
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
