import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { EntityRow } from '@/components/entity-row';
import { ExamFormModal } from '@/components/exam-form-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCourses, useExams } from '@/data/store';
import type { Exam } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlTextAlign } from '@/utils/rtl';

export default function ExamsScreen() {
  const exams = useExams();
  const courses = useCourses();
  const screenPadding = useScreenPadding();

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>(undefined);

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const sortedExams = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date)), [exams]);

  function openCreate() {
    setEditingExam(undefined);
    setShowForm(true);
  }

  function openEdit(exam: Exam) {
    setEditingExam(exam);
    setShowForm(true);
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedExams}
        keyExtractor={(exam) => exam.id}
        renderItem={({ item }) => {
          const isPast = item.grade !== undefined;
          return (
            <Pressable onPress={() => openEdit(item)} style={({ pressed }) => pressed && styles.pressed}>
              <EntityRow
                title={item.title}
                subtitle={[courseNameById.get(item.courseId), item.date].filter(Boolean).join(' · ')}
                trailing={<Badge label={isPast ? String(item.grade) : 'קרב'} tone={isPast ? 'success' : 'info'} />}
              />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          screenPadding,
        ]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין מבחנים
          </ThemedText>
        }
      />

      <Fab onPress={openCreate} />

      <ExamFormModal visible={showForm} onClose={() => setShowForm(false)} exam={editingExam} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
