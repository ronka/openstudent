import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { FormSheet } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_STATUSES, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import type { CourseStatus } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Picker for a course's status. Choosing a status sets a manual override
 * (`onSelect`); choosing "אוטומטי" clears it (`onClear`) so status reverts to
 * auto-derivation from year/semester/grade.
 *
 * `override` is the currently-stored override (undefined when auto); `derived`
 * is the status actually in effect right now — shown next to the auto row so the
 * user can see what auto would pick.
 */
export function CourseStatusModal({
  visible,
  onClose,
  override,
  derived,
  onSelect,
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  override: CourseStatus | undefined;
  derived: CourseStatus;
  onSelect: (status: CourseStatus) => void;
  onClear: () => void;
}) {
  return (
    <FormSheet visible={visible} onClose={onClose} title="סטטוס קורס">
      <View style={styles.body}>
        <Pressable
          onPress={() => {
            onClear();
            onClose();
          }}>
          <ThemedView
            type={override === undefined ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.row}>
            <ThemedText style={styles.rowLabel}>אוטומטי</ThemedText>
            <Badge label={COURSE_STATUS_LABELS[derived]} tone={COURSE_STATUS_TONES[derived]} />
          </ThemedView>
        </Pressable>

        {COURSE_STATUSES.map((status) => (
          <Pressable
            key={status}
            onPress={() => {
              onSelect(status);
              onClose();
            }}>
            <ThemedView
              type={override === status ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.row}>
              <ThemedText style={styles.rowLabel}>{COURSE_STATUS_LABELS[status]}</ThemedText>
              <Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />
            </ThemedView>
          </Pressable>
        ))}
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowLabel: {
    textAlign: rtlTextAlign.start,
  },
});
