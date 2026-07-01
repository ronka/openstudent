import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { EntityRow } from '@/components/entity-row';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONES, COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { useAssignments, useCourses, useExams, useRecordings } from '@/data/store';

const RECENT_LIMIT = 5;

export default function DashboardScreen() {
  const courses = useCourses();
  const assignments = useAssignments();
  const exams = useExams();
  const recordings = useRecordings();
  const insets = useSafeAreaInsets();

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const studyingCourses = useMemo(() => courses.filter((course) => course.status === 'studying'), [courses]);

  const openAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status !== 'done')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [assignments]
  );

  const upcomingExams = useMemo(
    () =>
      exams
        .filter((exam) => exam.grade === undefined)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [exams]
  );

  const recentAssignments = useMemo(
    () =>
      [...assignments]
        .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
        .slice(0, RECENT_LIMIT),
    [assignments]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
        ]}>
        <Section title="קורסים בלימוד" emptyLabel="אין קורסים בלימוד כרגע" isEmpty={studyingCourses.length === 0}>
          {studyingCourses.map((course) => (
            <EntityRow
              key={course.id}
              title={course.name}
              subtitle={[course.courseNumber, course.faculty].filter(Boolean).join(' · ')}
              trailing={<Badge label={COURSE_STATUS_LABELS[course.status]} tone={COURSE_STATUS_TONES[course.status]} />}
              href={`/courses/${course.id}`}
            />
          ))}
        </Section>

        <Section title="משימות TODO" emptyLabel="אין משימות פתוחות" isEmpty={openAssignments.length === 0}>
          {openAssignments.map((assignment) => (
            <EntityRow
              key={assignment.id}
              title={assignment.name}
              subtitle={[courseNameById.get(assignment.courseId ?? ''), assignment.dueDate].filter(Boolean).join(' · ')}
              trailing={
                <Badge
                  label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                  tone={ASSIGNMENT_STATUS_TONES[assignment.status]}
                />
              }
              href={assignment.courseId ? `/courses/${assignment.courseId}` : undefined}
            />
          ))}
        </Section>

        <Section title="מבחנים קרבים" emptyLabel="אין מבחנים קרבים" isEmpty={upcomingExams.length === 0}>
          {upcomingExams.map((exam) => (
            <EntityRow
              key={exam.id}
              title={exam.title}
              subtitle={courseNameById.get(exam.courseId)}
              trailing={<ThemedText type="smallBold">{exam.date}</ThemedText>}
              href={`/courses/${exam.courseId}`}
            />
          ))}
        </Section>

        <Section title="מעקב הקלטות" emptyLabel="אין הקלטות במעקב" isEmpty={recordings.length === 0}>
          {recordings.map((recording) => (
            <EntityRow
              key={recording.id}
              title={recording.name}
              subtitle={courseNameById.get(recording.courseId)}
              trailing={<ThemedText type="smallBold">#{recording.recordingNumber}</ThemedText>}
              href={`/courses/${recording.courseId}`}
            />
          ))}
        </Section>

        <Section title="יומן מטלות" emptyLabel="אין מטלות" isEmpty={recentAssignments.length === 0}>
          {recentAssignments.map((assignment) => (
            <EntityRow
              key={assignment.id}
              title={assignment.name}
              subtitle={[courseNameById.get(assignment.courseId ?? ''), assignment.dueDate].filter(Boolean).join(' · ')}
              trailing={
                <Badge
                  label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                  tone={ASSIGNMENT_STATUS_TONES[assignment.status]}
                />
              }
              href={assignment.courseId ? `/courses/${assignment.courseId}` : undefined}
            />
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
});
