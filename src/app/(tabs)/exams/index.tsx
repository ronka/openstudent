import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { CourseFilterChip } from '@/components/course-select-modal';
import { EntityRow } from '@/components/entity-row';
import { ExamFormModal } from '@/components/exam-form-modal';
import { FilterChip } from '@/components/filter-chip';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCurrentSemester, isCurrentSemester } from '@/data/semester';
import { examsCollection, useCourses, useExams } from '@/data/store';
import type { Exam } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type StatusFilter = 'all' | 'upcoming' | 'graded';

const STATUS_FILTERS: StatusFilter[] = ['all', 'upcoming', 'graded'];

const STATUS_FILTER_EMOJI: Record<StatusFilter, string> = {
  all: '📋',
  upcoming: '🕒',
  graded: '✅',
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'הכל',
  upcoming: 'קרובים',
  graded: 'עברו',
};

export default function ExamsScreen() {
  const exams = useExams();
  const courses = useCourses();
  const screenPadding = useScreenPadding();

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>(undefined);
  // Default to upcoming exams — that's what students need to see first.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');
  // Default to the active semester so the list opens on what's actually relevant now.
  const [semesterScope, setSemesterScope] = useState<'current' | 'all'>('current');

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const filterableCourses = useMemo(() => {
    const ids = new Set(exams.map((exam) => exam.courseId).filter(Boolean));
    return courses.filter((course) => ids.has(course.id));
  }, [exams, courses]);

  const currentSemesterCourseIds = useMemo(() => {
    const current = getCurrentSemester();
    return new Set(courses.filter((course) => isCurrentSemester(course, current)).map((course) => course.id));
  }, [courses]);

  const filteredExams = useMemo(
    () =>
      exams
        .filter((exam) => {
          if (statusFilter === 'all') return true;
          const isPast = exam.grade !== undefined;
          return statusFilter === 'graded' ? isPast : !isPast;
        })
        .filter((exam) => courseFilter === 'all' || exam.courseId === courseFilter)
        // Semester scope only applies to the "all courses" view — picking a specific course shows it regardless.
        .filter(
          (exam) =>
            semesterScope === 'all' || courseFilter !== 'all' || currentSemesterCourseIds.has(exam.courseId)
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [exams, statusFilter, courseFilter, semesterScope, currentSemesterCourseIds]
  );

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
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              label={`${STATUS_FILTER_EMOJI[status]} ${STATUS_FILTER_LABELS[status]}`}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </ScrollView>
        <View style={styles.chipRow}>
          <FilterChip
            label="🎓 הסמסטר הנוכחי"
            selected={semesterScope === 'current'}
            onPress={() => setSemesterScope((scope) => (scope === 'current' ? 'all' : 'current'))}
          />
          <CourseFilterChip
            courses={filterableCourses}
            selectedCourseId={courseFilter === 'all' ? undefined : courseFilter}
            onChange={(id) => setCourseFilter(id ?? 'all')}
            clearLabel="כל הקורסים"
          />
        </View>
      </View>

      <FlatList
        data={filteredExams}
        keyExtractor={(exam) => exam.id}
        renderItem={({ item }) => {
          const isPast = item.grade !== undefined;
          return (
            <SwipeableRow onDelete={() => examsCollection.remove(item.id)}>
              <Pressable onPress={() => openEdit(item)} style={({ pressed }) => pressed && styles.pressed}>
                <EntityRow
                  title={item.title}
                  subtitle={[courseNameById.get(item.courseId), item.date].filter(Boolean).join(' · ')}
                  trailing={<Badge label={isPast ? String(item.grade) : 'קרב'} tone={isPast ? 'success' : 'info'} />}
                />
              </Pressable>
            </SwipeableRow>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: screenPadding.paddingBottom },
        ]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין מבחנים תואמים
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
  pressed: {
    opacity: 0.7,
  },
});
