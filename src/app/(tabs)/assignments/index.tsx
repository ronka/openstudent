import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { AssignmentFormModal } from '@/components/assignment-form-modal';
import { Badge, type BadgeTone } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { CourseFilterChip } from '@/components/course-select-modal';
import { EntityRow } from '@/components/entity-row';
import { FilterChip } from '@/components/filter-chip';
import { SwipeableRow } from '@/components/swipeable-row';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUSES } from '@/data/constants';
import { assignmentsCollection, useAssignments, useCourses } from '@/data/store';
import { getCurrentSemester, isCurrentSemester } from '@/data/semester';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Assignment, AssignmentStatus, AssignmentType } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type StatusFilter = 'all' | AssignmentStatus;

/** A small emoji per filter so the toolbar reads at a glance (and isn't so plain). */
const STATUS_FILTER_EMOJI: Record<StatusFilter, string> = {
  all: '📋',
  todo: '✏️',
  done: '✅',
};

/** ממ״נ (tutor-marked) vs ממ״ח (computer) — a tiny identity cue on each row. */
const TYPE_EMOJI: Record<AssignmentType, string> = {
  MAMAN: '📝',
  MAMACH: '💻',
};

/** Local tone for the status pill: a blue "to-do" and green "done" splash of color.
 * Kept separate from ASSIGNMENT_STATUS_TONES so the dashboard's neutral bar is unaffected. */
const STATUS_BADGE_TONE: Record<AssignmentStatus, BadgeTone> = {
  todo: 'info',
  done: 'success',
};

function AssignmentRow({ assignment, courseName }: { assignment: Assignment; courseName?: string }) {
  const checked = assignment.status === 'done';
  const subtitle = [courseName, assignment.dueDate && `📅 ${assignment.dueDate}`].filter(Boolean).join(' · ');
  return (
    <SwipeableRow
      onDelete={() => {
        assignmentsCollection.remove(assignment.id);
        posthog.capture('assignment_deleted', { assignment_id: assignment.id, source: 'assignments_list' });
      }}>
      <EntityRow
        title={`${TYPE_EMOJI[assignment.type]} ${assignment.name}`}
        subtitle={subtitle}
        leading={
          <TaskCheckbox
            checked={checked}
            onToggle={() => {
              const toStatus = checked ? 'todo' : 'done';
              assignmentsCollection.update(assignment.id, { status: toStatus });
              posthog.capture('assignment_status_toggled', {
                assignment_id: assignment.id,
                from_status: assignment.status,
                to_status: toStatus,
                source: 'assignments_list',
              });
            }}
          />
        }
        trailing={<Badge label={ASSIGNMENT_STATUS_LABELS[assignment.status]} tone={STATUS_BADGE_TONE[assignment.status]} />}
        href={`/assignments/${assignment.id}`}
      />
    </SwipeableRow>
  );
}

export default function AssignmentsScreen() {
  const assignments = useAssignments();
  const courses = useCourses();
  const screenPadding = useScreenPadding();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');
  // Default to the active semester so the list opens on what's actually due now.
  const [semesterScope, setSemesterScope] = useState<'current' | 'all'>('current');
  const [showForm, setShowForm] = useState(false);

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const filterableCourses = useMemo(() => {
    const ids = new Set(assignments.map((assignment) => assignment.courseId).filter(Boolean));
    return courses.filter((course) => ids.has(course.id));
  }, [assignments, courses]);

  const currentSemesterCourseIds = useMemo(() => {
    const current = getCurrentSemester();
    return new Set(courses.filter((course) => isCurrentSemester(course, current)).map((course) => course.id));
  }, [courses]);

  const filtered = useMemo(
    () =>
      assignments
        .filter((assignment) => statusFilter === 'all' || assignment.status === statusFilter)
        .filter((assignment) => courseFilter === 'all' || assignment.courseId === courseFilter)
        // Semester scope only applies to the "all courses" view — picking a specific course shows it regardless.
        .filter(
          (assignment) =>
            semesterScope === 'all' ||
            courseFilter !== 'all' ||
            currentSemesterCourseIds.has(assignment.courseId)
        )
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [assignments, statusFilter, courseFilter, semesterScope, currentSemesterCourseIds]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label={`${STATUS_FILTER_EMOJI.all} הכל`}
            selected={statusFilter === 'all'}
            onPress={() => {
              setStatusFilter('all');
              posthog.capture('assignment_filter_changed', { filter_type: 'status', value: 'all' });
            }}
          />
          {ASSIGNMENT_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={`${STATUS_FILTER_EMOJI[status]} ${ASSIGNMENT_STATUS_LABELS[status]}`}
              selected={statusFilter === status}
              onPress={() => {
                setStatusFilter(status);
                posthog.capture('assignment_filter_changed', { filter_type: 'status', value: status });
              }}
            />
          ))}
        </ScrollView>
        <View style={styles.chipRow}>
          <FilterChip
            label="🎓 הסמסטר הנוכחי"
            selected={semesterScope === 'current'}
            onPress={() => {
              setSemesterScope((scope) => (scope === 'current' ? 'all' : 'current'));
              posthog.capture('assignment_filter_changed', { filter_type: 'semester_scope' });
            }}
          />
          <CourseFilterChip
            courses={filterableCourses}
            selectedCourseId={courseFilter === 'all' ? undefined : courseFilter}
            onChange={(id) => {
              setCourseFilter(id ?? 'all');
              posthog.capture('assignment_filter_changed', { filter_type: 'course', value: id ?? 'all' });
            }}
            clearLabel="כל הקורסים"
          />
        </View>
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
    // Native header already reserves the top safe area — only a small breathing gap here.
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
