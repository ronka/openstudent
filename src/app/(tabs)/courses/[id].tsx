import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_TONES,
  COURSE_STATUS_LABELS,
  COURSE_STATUS_TONES,
} from '@/data/constants';
import {
  useAssignmentsByCourse,
  useCourse,
  useExamsByCourse,
  useMaterialsByCourse,
  useRecordingsByCourse,
} from '@/data/store';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = useCourse(id);
  const assignments = useAssignmentsByCourse(id);
  const exams = useExamsByCourse(id);
  const recordings = useRecordingsByCourse(id);
  const materials = useMaterialsByCourse(id);

  if (!course) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'קורס' }} />
        <ThemedText style={styles.notFound}>הקורס לא נמצא</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="subtitle" style={styles.name}>
              {course.name}
            </ThemedText>
            <Badge label={COURSE_STATUS_LABELS[course.status]} tone={COURSE_STATUS_TONES[course.status]} />
          </View>

          <View style={styles.metaRow}>
            {course.courseNumber && <ThemedText themeColor="textSecondary">{course.courseNumber}</ThemedText>}
            {course.faculty && <ThemedText themeColor="textSecondary">{course.faculty}</ThemedText>}
            {course.credits !== undefined && (
              <ThemedText themeColor="textSecondary">{course.credits} נ&quot;ז</ThemedText>
            )}
          </View>

          <View style={styles.metaRow}>
            <ThemedText themeColor="textSecondary">{course.type}</ThemedText>
            {course.level && <ThemedText themeColor="textSecondary">רמה {course.level}</ThemedText>}
            {course.grade !== undefined && (
              <ThemedText themeColor="textSecondary">ציון {course.grade}</ThemedText>
            )}
          </View>

          {course.notes && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notes}>
              {course.notes}
            </ThemedText>
          )}
        </View>

        <Section title="מטלות" emptyLabel="אין מטלות לקורס זה" isEmpty={assignments.length === 0}>
          {assignments.map((assignment) => (
            <ThemedView key={assignment.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText style={styles.rowTitle}>{assignment.name}</ThemedText>
                {assignment.dueDate && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {assignment.dueDate}
                  </ThemedText>
                )}
              </View>
              <Badge
                label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                tone={ASSIGNMENT_STATUS_TONES[assignment.status]}
              />
            </ThemedView>
          ))}
        </Section>

        <Section title="מבחנים" emptyLabel="אין מבחנים לקורס זה" isEmpty={exams.length === 0}>
          {exams.map((exam) => (
            <ThemedView key={exam.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText style={styles.rowTitle}>{exam.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {exam.date}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{exam.grade !== undefined ? exam.grade : '—'}</ThemedText>
            </ThemedView>
          ))}
        </Section>

        <Section title="הקלטות" emptyLabel="אין הקלטות לקורס זה" isEmpty={recordings.length === 0}>
          {recordings.map((recording) => (
            <ThemedView key={recording.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText style={styles.rowTitle}>{recording.name}</ThemedText>
              </View>
              <ThemedText type="smallBold">#{recording.recordingNumber}</ThemedText>
            </ThemedView>
          ))}
        </Section>

        <Section title="חומרים" emptyLabel="אין חומרים לקורס זה" isEmpty={materials.length === 0}>
          {materials.map((material) => (
            <ThemedView key={material.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText style={styles.rowTitle}>{material.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {material.createdAt}
                </ThemedText>
              </View>
            </ThemedView>
          ))}
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  notFound: {
    textAlign: rtlTextAlign.center,
    margin: Spacing.four,
  },
  header: {
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
  notes: {
    textAlign: rtlTextAlign.start,
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
    gap: Spacing.half,
    ...rtlMargin.marginEnd(Spacing.three),
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
});
