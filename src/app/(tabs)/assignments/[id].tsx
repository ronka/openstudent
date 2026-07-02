import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AssignmentFormModal } from '@/components/assignment-form-modal';
import { SheetButton } from '@/components/form-sheet';
import { NotFoundView } from '@/components/not-found-view';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_TYPE_LABELS } from '@/data/constants';
import { assignmentsCollection, useAssignment, useCourse } from '@/data/store';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const assignment = useAssignment(id);
  const course = useCourse(assignment?.courseId);
  const [showEditForm, setShowEditForm] = useState(false);

  function handleDelete() {
    if (!assignment) return;
    Alert.alert('מחיקת מטלה', `למחוק את "${assignment.name}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => {
          assignmentsCollection.remove(assignment.id);
          router.back();
        },
      },
    ]);
  }

  if (!assignment) {
    return <NotFoundView title="מטלה" message="המטלה לא נמצאה" />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: assignment.name }} />
      <View style={styles.content}>
        <View style={styles.headerTop}>
          <ThemedText type="subtitle" style={styles.name}>
            {assignment.name}
          </ThemedText>
          <TaskCheckbox
            checked={assignment.status === 'done'}
            onToggle={() =>
              assignmentsCollection.update(assignment.id, {
                status: assignment.status === 'done' ? 'todo' : 'done',
              })
            }
          />
        </View>

        {course && (
          <Link href={`/courses/${course.id}`} asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="link" themeColor="textSecondary">
                {course.name}
              </ThemedText>
            </Pressable>
          </Link>
        )}

        <View style={styles.metaRow}>
          <ThemedText themeColor="textSecondary">
            {ASSIGNMENT_TYPE_LABELS[assignment.type]} {assignment.taskNumber}
          </ThemedText>
          {assignment.dueDate && <ThemedText themeColor="textSecondary">תאריך יעד {assignment.dueDate}</ThemedText>}
        </View>

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <SheetButton label="עריכה" onPress={() => setShowEditForm(true)} />
          </View>
          <View style={styles.actionButton}>
            <SheetButton label="מחיקה" variant="destructive" onPress={handleDelete} />
          </View>
        </View>
      </View>

      <AssignmentFormModal visible={showEditForm} onClose={() => setShowEditForm(false)} assignment={assignment} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerTop: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
  metaRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
