import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { CourseCatalogPicker } from '@/components/course-catalog-picker';
import { CourseFilterChip } from '@/components/course-select-modal';
import { FilterChip } from '@/components/filter-chip';
import { QuickTasksModal } from '@/components/quick-tasks-modal';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_STATUSES, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import { coursesCollection, useCourses } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Course, CourseStatus } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

type StatusFilter = 'all' | CourseStatus;

const STATUS_FILTER_EMOJI: Record<StatusFilter, string> = {
  all: '📋',
  planned: '🗓️',
  studying: '📖',
  passed: '✅',
};

function CourseRow({ course, current }: { course: Course; current: ReturnType<typeof getCurrentSemester> }) {
  const status = deriveCourseStatus(course, current);
  return (
    <SwipeableRow
      onDelete={() => {
        coursesCollection.remove(course.id);
        posthog.capture('course_deleted', { course_id: course.id, source: 'courses_list' });
      }}>
      <Link href={{ pathname: '/courses/[id]', params: { id: course.id } }} asChild>
        <Pressable style={({ pressed }) => pressed && styles.rowPressed}>
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={styles.rowMain}>
              <ThemedText style={styles.name}>{course.name}</ThemedText>
              <View style={styles.metaRow}>
                {course.courseNumber && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {course.courseNumber}
                  </ThemedText>
                )}
                {course.faculty && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {course.faculty}
                  </ThemedText>
                )}
                {course.credits !== undefined && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {course.credits} נ&quot;ז
                  </ThemedText>
                )}
              </View>
            </View>
            <Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />
          </ThemedView>
        </Pressable>
      </Link>
    </SwipeableRow>
  );
}

export default function CoursesScreen() {
  const courses = useCourses();
  const screenPadding = useScreenPadding();
  const current = useMemo(() => getCurrentSemester(), []);

  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [quickTasksQueue, setQuickTasksQueue] = useState<{ id: string; name: string }[]>([]);
  const quickTasksFor = quickTasksQueue[0];
  // Default to courses in progress — that's what's actually relevant right now.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('studying');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');

  const filteredCourses = useMemo(
    () =>
      courses
        .filter(
          (course) => statusFilter === 'all' || deriveCourseStatus(course, current) === statusFilter
        )
        .filter((course) => courseFilter === 'all' || course.id === courseFilter),
    [courses, statusFilter, courseFilter, current]
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
              posthog.capture('course_filter_changed', { filter_type: 'status', value: 'all' });
            }}
          />
          {COURSE_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={`${STATUS_FILTER_EMOJI[status]} ${COURSE_STATUS_LABELS[status]}`}
              selected={statusFilter === status}
              onPress={() => {
                setStatusFilter(status);
                posthog.capture('course_filter_changed', { filter_type: 'status', value: status });
              }}
            />
          ))}
        </ScrollView>
        <View style={styles.chipRow}>
          <CourseFilterChip
            courses={courses}
            selectedCourseId={courseFilter === 'all' ? undefined : courseFilter}
            onChange={(id) => {
              setCourseFilter(id ?? 'all');
              posthog.capture('course_filter_changed', { filter_type: 'course', value: id ?? 'all' });
            }}
            clearLabel="כל הקורסים"
          />
        </View>
      </View>

      <FlatList
        data={filteredCourses}
        keyExtractor={(course) => course.id}
        renderItem={({ item }) => <CourseRow course={item} current={current} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: screenPadding.paddingBottom },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין קורסים תואמים
          </ThemedText>
        }
      />

      <Fab onPress={() => setShowCatalogPicker(true)} />

      <CourseCatalogPicker
        visible={showCatalogPicker}
        onClose={() => setShowCatalogPicker(false)}
        onAdded={(created) => {
          setShowCatalogPicker(false);
          setQuickTasksQueue(created);
        }}
      />

      <QuickTasksModal
        key={quickTasksFor?.id}
        visible={quickTasksFor !== undefined}
        courseId={quickTasksFor?.id ?? ''}
        courseName={quickTasksFor?.name ?? ''}
        onClose={() => setQuickTasksQueue((prev) => prev.slice(1))}
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
  rowPressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowMain: {
    flex: 1,
    ...rtlMargin.marginEnd(Spacing.three),
  },
  name: {
    textAlign: rtlTextAlign.start,
  },
  metaRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.three,
    marginTop: Spacing.half,
  },
});
