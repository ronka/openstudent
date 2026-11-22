import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { SheetButton } from '@/components/form-sheet';
import { formatSharedDate } from '@/components/shared-deadlines-offer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { isDueDateInSemester, findShared, type SharedDeadline } from '@/data/shared-deadlines';
import { confirmDeadline, courseDeadlineKey, fetchSharedDeadlines, getMyVote } from '@/data/shared-deadlines-api';
import { assignmentsCollection } from '@/data/store';
import type { Assignment, Course } from '@/data/types';
import { rtlTextAlign } from '@/utils/rtl';

/**
 * On an assignment's page: what other students reported for the same item. Lets the
 * student confirm the shared date, adopt it, or — if theirs differs — report their own as
 * the correction. Hidden whenever there is nothing shared or the API is unreachable.
 */
export function SharedDeadlineNote({ course, assignment }: { course: Course; assignment: Assignment }) {
  const key = courseDeadlineKey(course);
  const courseNumber = key?.courseNumber;
  const year = key?.year;
  const semester = key?.semester;
  const [item, setItem] = useState<SharedDeadline | undefined>(undefined);
  const [myVote, setMyVote] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courseNumber || year === undefined || !semester) return;
    let cancelled = false;
    const itemKey = { courseNumber, year, semester };
    fetchSharedDeadlines(itemKey).then((result) => {
      if (cancelled) return;
      setItem(findShared(result, assignment.type, assignment.taskNumber));
      setMyVote(getMyVote(itemKey, assignment.type, assignment.taskNumber));
    });
    return () => {
      cancelled = true;
    };
  }, [courseNumber, year, semester, assignment.type, assignment.taskNumber]);

  if (!key || !item) return null;

  const local = assignment.dueDate;
  const matches = local === item.dueDate;
  const canReportMine = !!local && !matches && isDueDateInSemester(local, key.year, key.semester);

  async function vote(date: string, kind: 'confirm' | 'correct') {
    if (!key || !item) return;
    setBusy(true);
    const ok = await confirmDeadline(key, assignment.type, assignment.taskNumber, date, kind);
    if (ok) {
      setMyVote(date);
      // Reflect the vote locally without a refetch: it moves this install's count.
      setItem((prev) => (prev && date === prev.dueDate && myVote !== date ? { ...prev, confirmations: prev.confirmations + 1 } : prev));
    }
    setBusy(false);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" style={styles.text}>
        {matches
          ? `${item.confirmations} סטודנטים דיווחו על התאריך הזה`
          : `סטודנטים אחרים דיווחו על ${formatSharedDate(item.dueDate)} (${item.confirmations})`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        התאריכים מוזנים על ידי סטודנטים ויכולים להיות לא מדויקים.
      </ThemedText>

      {matches && myVote !== item.dueDate && (
        <SheetButton label="גם אצלי זה התאריך" disabled={busy} onPress={() => vote(item.dueDate, 'confirm')} />
      )}
      {matches && myVote === item.dueDate && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          תודה, אישרת את התאריך ✓
        </ThemedText>
      )}

      {!matches && (
        <SheetButton
          label="עדכון לתאריך הזה"
          disabled={busy}
          onPress={() => assignmentsCollection.update(assignment.id, { dueDate: item.dueDate })}
        />
      )}
      {canReportMine && myVote !== local && (
        <SheetButton
          label="התאריך שלי נכון — לדווח כתיקון"
          variant="ghost"
          disabled={busy}
          onPress={() => local && vote(local, 'correct')}
        />
      )}
      {canReportMine && myVote === local && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          דיווחת על התאריך שלך ✓
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  text: {
    textAlign: rtlTextAlign.start,
  },
});
