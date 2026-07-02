import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { DashboardCard } from '@/components/dashboard-card';
import { EntityRow } from '@/components/entity-row';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { ProgressBar } from '@/components/progress-bar';
import { SegmentedBar } from '@/components/segmented-bar';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONES } from '@/data/constants';
import {
  assignmentBreakdown,
  degreeStats,
  gpaStats,
  gradeTimeline,
  upcomingExamsSorted,
} from '@/data/stats';
import { useAssignments, useCourses, useExams, useRecordings } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme } from '@/hooks/use-theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const OPEN_ASSIGNMENTS_LIMIT = 5;

export default function DashboardScreen() {
  const courses = useCourses();
  const assignments = useAssignments();
  const exams = useExams();
  const recordings = useRecordings();
  const screenPadding = useScreenPadding();
  const theme = useTheme();

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const degree = useMemo(() => degreeStats(courses), [courses]);
  const gpa = useMemo(() => gpaStats(courses), [courses]);
  const breakdown = useMemo(() => assignmentBreakdown(assignments), [assignments]);
  const grades = useMemo(() => gradeTimeline(exams), [exams]);
  const upcomingExams = useMemo(() => upcomingExamsSorted(exams), [exams]);

  const openAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status !== 'done')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, OPEN_ASSIGNMENTS_LIMIT),
    [assignments]
  );

  const degreePercent = Math.round(degree.degreePct * 100);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, screenPadding]}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerText}>
            היי 👋
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.headerText}>
            {`${degree.passedCount} קורסים הושלמו · ${degreePercent}% מהתואר`}
          </ThemedText>
        </View>

        <View style={styles.grid}>
          <StatCard value={`${degreePercent}%`} label="מהתואר" progress={degree.degreePct} />
          <StatCard
            value={gpa.count > 0 ? gpa.gpa.toFixed(1) : '—'}
            label="ציון ממוצע"
            caption={`${gpa.count} קורסים`}
          />
          <StatCard value={String(breakdown.open)} label="משימות פתוחות" />
          <StatCard value={String(upcomingExams.length)} label="מבחנים קרבים" />
        </View>

        <DashboardCard title="התקדמות בתואר">
          <ProgressBar value={degree.degreePct} height={Spacing.three} showLabel />
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
            {`${degree.passedCredits}/${degree.totalCredits} נק"ז · עברו ${degree.passedCount} · בלימוד ${degree.studyingCount} · מתוכנן ${degree.plannedCount}`}
          </ThemedText>
        </DashboardCard>

        {grades.length > 0 && (
          <DashboardCard title="מגמת ציונים">
            <MiniBarChart data={grades.map((point) => ({ value: point.grade, key: point.date + point.title }))} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              {`ממוצע ${gpa.gpa.toFixed(1)} · הכי גבוה ${gpa.max} · הכי נמוך ${gpa.min}`}
            </ThemedText>
          </DashboardCard>
        )}

        <DashboardCard title="מטלות">
          <SegmentedBar
            segments={[
              { label: ASSIGNMENT_STATUS_LABELS.done, value: breakdown.done, color: '#15803D' },
              { label: ASSIGNMENT_STATUS_LABELS.in_progress, value: breakdown.in_progress, color: theme.accent },
              { label: ASSIGNMENT_STATUS_LABELS.todo, value: breakdown.todo, color: theme.textSecondary },
            ]}
          />
        </DashboardCard>

        <DashboardCard title="מבחנים קרבים">
          {upcomingExams.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              אין מבחנים קרבים
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {upcomingExams.map((exam) => (
                <EntityRow
                  key={exam.id}
                  title={exam.title}
                  subtitle={courseNameById.get(exam.courseId)}
                  trailing={<ThemedText type="smallBold">{exam.date}</ThemedText>}
                  href={`/courses/${exam.courseId}`}
                />
              ))}
            </View>
          )}
        </DashboardCard>

        <DashboardCard title="משימות TODO">
          {openAssignments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              אין משימות פתוחות
            </ThemedText>
          ) : (
            <View style={styles.list}>
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
            </View>
          )}
        </DashboardCard>

        <DashboardCard title="מעקב הקלטות">
          {recordings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              אין הקלטות במעקב
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {recordings.map((recording) => (
                <EntityRow
                  key={recording.id}
                  title={recording.name}
                  subtitle={courseNameById.get(recording.courseId)}
                  trailing={<ThemedText type="smallBold">#{recording.recordingNumber}</ThemedText>}
                  href={`/courses/${recording.courseId}`}
                />
              ))}
            </View>
          )}
        </DashboardCard>
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
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.half,
  },
  headerText: {
    textAlign: rtlTextAlign.start,
  },
  grid: {
    flexDirection: rtlFlexDirection.row,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  cardCaption: {
    textAlign: rtlTextAlign.start,
  },
});
