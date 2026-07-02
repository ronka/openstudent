import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { CourseCatalogPicker } from '@/components/course-catalog-picker';
import { QuickTasksModal } from '@/components/quick-tasks-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import { useCourses } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Course } from '@/data/types';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

function CourseRow({ course, current }: { course: Course; current: ReturnType<typeof getCurrentSemester> }) {
  const status = deriveCourseStatus(course, current);
  return (
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
  );
}

export default function CoursesScreen() {
  const courses = useCourses();
  const screenPadding = useScreenPadding();
  const current = useMemo(() => getCurrentSemester(), []);

  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [quickTasksQueue, setQuickTasksQueue] = useState<{ id: string; name: string }[]>([]);
  const quickTasksFor = quickTasksQueue[0];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={courses}
        keyExtractor={(course) => course.id}
        renderItem={({ item }) => <CourseRow course={item} current={current} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: screenPadding.paddingBottom },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  listContent: {
    padding: Spacing.three,
  },
  separator: {
    height: Spacing.two,
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
