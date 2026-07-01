import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { EntityRow } from '@/components/entity-row';
import { FilterChip } from '@/components/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONES, ASSIGNMENT_STATUSES } from '@/data/constants';
import { useAssignments, useCourses } from '@/data/store';
import type { Assignment, AssignmentStatus } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type StatusFilter = 'all' | AssignmentStatus;

function AssignmentRow({ assignment, courseName }: { assignment: Assignment; courseName?: string }) {
  return (
    <EntityRow
      title={assignment.name}
      subtitle={[courseName, assignment.dueDate].filter(Boolean).join(' · ')}
      trailing={
        <Badge
          label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
          tone={ASSIGNMENT_STATUS_TONES[assignment.status]}
        />
      }
      href={assignment.courseId ? `/courses/${assignment.courseId}` : undefined}
    />
  );
}

export default function AssignmentsScreen() {
  const assignments = useAssignments();
  const courses = useCourses();
  const insets = useSafeAreaInsets();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const filterableCourses = useMemo(() => {
    const ids = new Set(assignments.map((assignment) => assignment.courseId).filter(Boolean));
    return courses.filter((course) => ids.has(course.id));
  }, [assignments, courses]);

  const filtered = useMemo(
    () =>
      assignments
        .filter((assignment) => statusFilter === 'all' || assignment.status === statusFilter)
        .filter((assignment) => courseFilter === 'all' || assignment.courseId === courseFilter)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [assignments, statusFilter, courseFilter]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label="הכל" selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          {ASSIGNMENT_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={ASSIGNMENT_STATUS_LABELS[status]}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label="כל הקורסים" selected={courseFilter === 'all'} onPress={() => setCourseFilter('all')} />
          {filterableCourses.map((course) => (
            <FilterChip
              key={course.id}
              label={course.name}
              selected={courseFilter === course.id}
              onPress={() => setCourseFilter(course.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(assignment) => assignment.id}
        renderItem={({ item }) => (
          <AssignmentRow assignment={item} courseName={courseNameById.get(item.courseId ?? '')} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
        ]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין מטלות תואמות
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
  filters: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  chipRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
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
