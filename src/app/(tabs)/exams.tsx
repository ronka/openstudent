import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { EntityRow } from '@/components/entity-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCourses, useExams } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlTextAlign } from '@/utils/rtl';

export default function ExamsScreen() {
  const exams = useExams();
  const courses = useCourses();
  const screenPadding = useScreenPadding();

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const sortedExams = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date)), [exams]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sortedExams}
        keyExtractor={(exam) => exam.id}
        renderItem={({ item }) => {
          const isPast = item.grade !== undefined;
          return (
            <EntityRow
              title={item.title}
              subtitle={[courseNameById.get(item.courseId), item.date].filter(Boolean).join(' · ')}
              trailing={<Badge label={isPast ? String(item.grade) : 'קרב'} tone={isPast ? 'success' : 'info'} />}
              href={`/courses/${item.courseId}`}
            />
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
});
