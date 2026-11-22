import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { getAssignmentName } from '@/data/constants';
import { courseDeadlineKey, deadlineEventProps, fetchSharedDeadlines } from '@/data/shared-deadlines-api';
import { mergeWithLocal, type SharedDeadline } from '@/data/shared-deadlines';
import type { AssignmentType, Course } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { parseLocalDate } from '@/utils/date';
import { rtlTextAlign } from '@/utils/rtl';

const dateFormatter = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });

export function formatSharedDate(dueDate: string): string {
  const date = parseLocalDate(dueDate);
  return date ? dateFormatter.format(date) : dueDate;
}

/**
 * Offers the deadlines other students shared for a course (its own year + semester) that
 * the student does not have yet. Renders nothing while loading, when the API is
 * unavailable, or when there is nothing new — a quiet failure by design. The host decides
 * how to persist via `onAccept` (collection write, or onboarding's in-memory plan).
 */
export function SharedDeadlinesOffer({
  course,
  existing,
  onAccept,
}: {
  course: Pick<Course, 'courseNumber' | 'year' | 'semester'>;
  existing: { type: AssignmentType; taskNumber: number }[];
  onAccept: (items: SharedDeadline[]) => void;
}) {
  const key = useMemo(
    () => courseDeadlineKey(course),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course.courseNumber, course.year, course.semester]
  );
  const [shared, setShared] = useState<SharedDeadline[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const offeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchSharedDeadlines(key).then((result) => {
      if (!cancelled) setShared(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const offer = useMemo(() => mergeWithLocal(shared, existing), [shared, existing]);

  useEffect(() => {
    if (!key || offer.length === 0) return;
    const id = `${key.courseNumber}|${key.year}|${key.semester}`;
    if (offeredFor.current === id) return;
    offeredFor.current = id;
    posthog.capture('shared_deadlines_offered', { ...deadlineEventProps(key), count: offer.length });
  }, [key, offer.length]);

  if (!key || dismissed || offer.length === 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" style={styles.text}>
        מועדי הגשה שסטודנטים אחרים הזינו
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        סטודנטים בקורס הזה שיתפו תאריכים ל־{offer.length} מטלות. התאריכים הוזנו על ידי סטודנטים ויכולים להיות לא מדויקים —
        אפשר לערוך או למחוק אותם אחרי ההוספה.
      </ThemedText>
      <View style={styles.list}>
        {offer.map((item) => (
          <View key={`${item.type}-${item.taskNumber}`} style={styles.row}>
            <ThemedText type="small" style={styles.text}>
              {getAssignmentName(item.type, item.taskNumber)} · {formatSharedDate(item.dueDate)}
            </ThemedText>
          </View>
        ))}
      </View>
      <SheetButton
        label={`הוספת ${offer.length} מטלות`}
        onPress={() => {
          posthog.capture('shared_deadlines_added', { ...deadlineEventProps(key), count: offer.length });
          onAccept(offer);
        }}
      />
      <SheetButton label="לא עכשיו" variant="ghost" onPress={() => setDismissed(true)} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        השיתוף הוא בין סטודנטים, ללא קשר רשמי לאוניברסיטה הפתוחה.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  row: {
    paddingVertical: Spacing.half,
  },
  text: {
    textAlign: rtlTextAlign.start,
  },
});
