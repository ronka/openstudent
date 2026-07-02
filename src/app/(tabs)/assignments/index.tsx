import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { AssignmentFormModal } from '@/components/assignment-form-modal';
import { Fab } from '@/components/capture-fab';
import { EntityRow } from '@/components/entity-row';
import { FilterChip } from '@/components/filter-chip';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUSES } from '@/data/constants';
import { assignmentsCollection, useAssignments, useCourses } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Assignment, AssignmentStatus } from '@/data/types';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type StatusFilter = 'all' | AssignmentStatus;

function AssignmentRow({ assignment, courseName }: { assignment: Assignment; courseName?: string }) {
  const checked = assignment.status === 'done';
  return (
    <EntityRow
      title={assignment.name}
      subtitle={[courseName, assignment.dueDate].filter(Boolean).join(' · ')}
      leading={
        <TaskCheckbox
          checked={checked}
          onToggle={() => assignmentsCollection.update(assignment.id, { status: checked ? 'todo' : 'done' })}
        />
      }
      href={`/assignments/${assignment.id}`}
    />
  );
}

export default function AssignmentsScreen() {
  const assignments = useAssignments();
  const courses = useCourses();
  const screenPadding = useScreenPadding();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');
  const [showForm, setShowForm] = useState(false);

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
      <View style={[styles.filters, { paddingTop: screenPadding.paddingTop }]}>
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
          { paddingBottom: screenPadding.paddingBottom },
        ]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין מטלות תואמות
          </ThemedText>
        }
      />

      <Fab onPress={() => setShowForm(true)} />
      <AssignmentFormModal visible={showForm} onClose={() => setShowForm(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    gap: Spacing.two,
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
