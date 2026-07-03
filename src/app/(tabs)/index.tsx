import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TONE_BACKGROUND_CLASSNAMES } from '@/components/badge';
import { DashboardCard } from '@/components/dashboard-card';
import { EntityRow } from '@/components/entity-row';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { ProgressBar } from '@/components/progress-bar';
import { SegmentedBar } from '@/components/segmented-bar';
import { StatCard } from '@/components/stat-card';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONES, ASSIGNMENT_STATUSES } from '@/data/constants';
import { isCurrentSemester, getCurrentSemester } from '@/data/semester';
import {
  assignmentBreakdown,
  degreeStats,
  gpaStats,
  gradeTimeline,
  upcomingExamsSorted,
} from '@/data/stats';
import { assignmentsCollection, useAssignments, useCourses, useExams } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const OPEN_ASSIGNMENTS_LIMIT = 5;

export default function DashboardScreen() {
  const courses = useCourses();
  const assignments = useAssignments();
  const exams = useExams();
  const screenPadding = useScreenPadding();

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const current = useMemo(() => getCurrentSemester(), []);
  const currentSemesterCourses = useMemo(
    () => courses.filter((course) => isCurrentSemester(course, current)),
    [courses, current]
  );

  const degree = useMemo(() => degreeStats(courses), [courses]);
  const gpa = useMemo(() => gpaStats(courses), [courses]);
  const breakdown = useMemo(() => assignmentBreakdown(assignments), [assignments]);
  const grades = useMemo(() => gradeTimeline(exams), [exams]);
  const upcomingExams = useMemo(() => upcomingExamsSorted(exams), [exams]);

  const openTaskCountByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of assignments) {
      if (assignment.status !== 'todo') continue;
      map.set(assignment.courseId, (map.get(assignment.courseId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const nextExamDateByCourse = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of upcomingExams) {
      if (!map.has(exam.courseId)) map.set(exam.courseId, exam.date);
    }
    return map;
  }, [upcomingExams]);

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

        <DashboardCard title="הסמסטר הנוכחי">
          {currentSemesterCourses.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              אין קורסים בסמסטר הנוכחי
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {currentSemesterCourses.map((course) => (
                <EntityRow
                  key={course.id}
                  title={course.name}
                  subtitle={[
                    `${openTaskCountByCourse.get(course.id) ?? 0} משימות פתוחות`,
                    nextExamDateByCourse.get(course.id) ? `מבחן הבא: ${nextExamDateByCourse.get(course.id)}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  href={`/courses/${course.id}`}
                />
              ))}
            </View>
          )}
        </DashboardCard>

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

        <DashboardCard title="טיימר פומודורו" href="/pomodoro">
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
            התמקדו במשימה אחת בפרקי זמן של 25 דקות — הקישו כדי להתחיל סבב
          </ThemedText>
        </DashboardCard>

        <DashboardCard title="התקדמות בתואר">
          {degree.passedCount === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              הוסיפו קורסים שעברת כדי לראות התקדמות
            </ThemedText>
          ) : (
            <>
              <ProgressBar value={degree.degreePct} height={Spacing.three} showLabel />
              <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
                {`${degree.passedCredits}/${degree.totalCredits} נק"ז · עברו ${degree.passedCount} · בלימוד ${degree.studyingCount} · מתוכנן ${degree.plannedCount}`}
              </ThemedText>
            </>
          )}
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
            segments={ASSIGNMENT_STATUSES.map((status) => ({
              label: ASSIGNMENT_STATUS_LABELS[status],
              value: breakdown[status],
              colorClassName: TONE_BACKGROUND_CLASSNAMES[ASSIGNMENT_STATUS_TONES[status]],
            }))}
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
                  leading={
                    <TaskCheckbox
                      checked={false}
                      onToggle={() => assignmentsCollection.update(assignment.id, { status: 'done' })}
                    />
                  }
                  href={`/assignments/${assignment.id}`}
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
