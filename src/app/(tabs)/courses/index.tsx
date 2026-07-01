import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { useCourses } from '@/data/store';
import type { Course } from '@/data/types';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

function CourseRow({ course }: { course: Course }) {
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
          <Badge label={COURSE_STATUS_LABELS[course.status]} tone={COURSE_STATUS_TONES[course.status]} />
        </ThemedView>
      </Pressable>
    </Link>
  );
}

export default function CoursesScreen() {
  const courses = useCourses();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={courses}
        keyExtractor={(course) => course.id}
        renderItem={({ item }) => <CourseRow course={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
