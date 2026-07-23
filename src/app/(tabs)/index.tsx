import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DashboardCard } from '@/components/dashboard-card';
import { EntityRow } from '@/components/entity-row';
import { HighlightCard } from '@/components/highlight-card';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { StatCard } from '@/components/stat-card';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { DEGREE_CREDITS_TARGET } from '@/data/constants';
import { enableNotifications, markPromptSeen, usePromptSeen } from '@/data/notification-settings';
import { useExemptCredits, useName } from '@/data/profile';
import { randomQuote } from '@/data/quotes';
import { getCurrentSemester, isCurrentSemester } from '@/data/semester';
import {
  degreeStats,
  gpaStats,
  gradeTimeline,
  upcomingAssignmentsSorted,
  upcomingExamsSorted,
} from '@/data/stats';
import { assignmentsCollection, useAssignments, useCourses, useExams } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { formatDaysUntil } from '@/utils/date';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const OPEN_ASSIGNMENTS_LIMIT = 5;

export default function DashboardScreen() {
  const courses = useCourses();
  const assignments = useAssignments();
  const exams = useExams();
  const name = useName();
  const exemptCredits = useExemptCredits();
  const screenPadding = useScreenPadding();
  // The dashboard is behind the onboarding guard, so "onboarding complete" is implicit;
  // show the one-time nudge only to users who never saw the notifications prompt.
  const promptSeen = usePromptSeen();

  const handleEnableFromPrompt = useCallback(async () => {
    await enableNotifications();
    markPromptSeen();
    posthog.capture('dashboard_notifications_prompt_enabled');
  }, []);

  const handleDismissPrompt = useCallback(() => {
    markPromptSeen();
    posthog.capture('dashboard_notifications_prompt_dismissed');
  }, []);

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);

  const current = useMemo(() => getCurrentSemester(), []);
  const currentSemesterCourses = useMemo(
    () => courses.filter((course) => isCurrentSemester(course, current)),
    [courses, current]
  );

  const [quote] = useState(() => randomQuote());

  const degree = useMemo(() => degreeStats(courses, current, exemptCredits), [courses, current, exemptCredits]);
  const gpa = useMemo(() => gpaStats(exams, courses), [exams, courses]);
  const grades = useMemo(() => gradeTimeline(exams, courses), [exams, courses]);
  const upcomingExams = useMemo(() => upcomingExamsSorted(exams), [exams]);
  const nextExam = upcomingExams[0];

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
    () => upcomingAssignmentsSorted(assignments, OPEN_ASSIGNMENTS_LIMIT),
    [assignments]
  );
  const mostUrgentTask = openAssignments[0];

  const degreePercent = Math.round(degree.degreePct * 100);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, screenPadding]}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerText}>
            {name ? `היי ${name} 👋` : 'היי 👋'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.headerText}>
            {quote}
          </ThemedText>
        </View>

        {!promptSeen && (
          <DashboardCard>
            <ThemedText type="smallBold" style={styles.promptTitle}>
              🔔 רוצים תזכורת שבוע ויום לפני כל הגשה ובחינה?
            </ThemedText>
            <View style={styles.promptActions}>
              <Pressable
                onPress={handleEnableFromPrompt}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="text" style={styles.promptButton}>
                  <ThemedText type="smallBold" themeColor="background">
                    הפעילו תזכורות
                  </ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable onPress={handleDismissPrompt} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary">
                  לא עכשיו
                </ThemedText>
              </Pressable>
            </View>
          </DashboardCard>
        )}

        <View style={styles.heroColumn}>
          <View style={styles.heroCell}>
            {mostUrgentTask ? (
              <HighlightCard
                tone="warning"
                emoji="⏰"
                label="המשימה הדחופה"
                title={mostUrgentTask.name}
                subtitle={[
                  courseNameById.get(mostUrgentTask.courseId),
                  mostUrgentTask.dueDate ? formatDaysUntil(mostUrgentTask.dueDate) : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                href={`/assignments/${mostUrgentTask.id}`}
                onPress={() => posthog.capture('dashboard_urgent_task_tapped', { assignment_id: mostUrgentTask.id })}
              />
            ) : (
              <HighlightCard tone="neutral" emoji="✅" label="משימות" title="אין משימות דחופות" />
            )}
          </View>
          <View style={styles.heroCell}>
            {nextExam ? (
              <HighlightCard
                tone="info"
                emoji="📝"
                label="המבחן הקרוב"
                title={nextExam.title}
                subtitle={[courseNameById.get(nextExam.courseId), formatDaysUntil(nextExam.date)]
                  .filter(Boolean)
                  .join(' · ')}
                href={`/courses/${nextExam.courseId}`}
                onPress={() => posthog.capture('dashboard_next_exam_tapped', { exam_id: nextExam.id })}
              />
            ) : (
              <HighlightCard tone="neutral" emoji="🎉" label="מבחנים" title="אין מבחנים קרבים" />
            )}
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard
            value={`${degreePercent}%`}
            label="מהתואר"
            caption={`${degree.completedCredits}/${DEGREE_CREDITS_TARGET} נק״ז`}
            progress={degree.degreePct}
          />
          <StatCard
            value={gpa.count > 0 ? gpa.gpa.toFixed(1) : '—'}
            label="ציון ממוצע"
            caption={`${gpa.count} מבחנים`}
          />
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
                  onPress={() => posthog.capture('dashboard_course_tapped', { course_id: course.id })}
                />
              ))}
            </View>
          )}
        </DashboardCard>

        <HighlightCard
          tone="destructive"
          soft
          emoji="🍅"
          title="בואו נלמד עם פומודורו"
          subtitle="התמקדו 25 דקות בכל פעם — הקישו כדי להתחיל"
          trailing={
            <Text className="text-destructive" style={styles.chevron}>
              ‹
            </Text>
          }
          href="/pomodoro"
          style={styles.fullWidth}
          onPress={() => posthog.capture('dashboard_pomodoro_promo_tapped')}
        />

        {grades.length > 0 && (
          <DashboardCard title="מגמת ציונים">
            <MiniBarChart data={grades.map((point) => ({ value: point.grade, key: point.date + point.title }))} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardCaption}>
              {`ממוצע ${gpa.gpa.toFixed(1)} · הכי גבוה ${gpa.max} · הכי נמוך ${gpa.min}`}
            </ThemedText>
          </DashboardCard>
        )}

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
                  onPress={() => posthog.capture('dashboard_exam_tapped', { exam_id: exam.id })}
                />
              ))}
            </View>
          )}
        </DashboardCard>

        <DashboardCard
          title="המשימות הקרובות"
          action={
            <Link href="/assignments" asChild>
              <Pressable onPress={() => posthog.capture('dashboard_assignments_see_all_tapped')}>
                <ThemedText type="link">הצג הכל ›</ThemedText>
              </Pressable>
            </Link>
          }>
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
                      onToggle={() => {
                        assignmentsCollection.update(assignment.id, { status: 'done' });
                        posthog.capture('dashboard_task_toggled', { assignment_id: assignment.id, to_status: 'done' });
                      }}
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
  heroColumn: {
    gap: Spacing.two,
  },
  heroCell: {
    alignSelf: 'stretch',
  },
  fullWidth: {
    flex: undefined,
    alignSelf: 'stretch',
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  list: {
    gap: Spacing.two,
  },
  cardCaption: {
    textAlign: rtlTextAlign.start,
  },
  promptTitle: {
    textAlign: rtlTextAlign.start,
  },
  promptActions: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.three,
  },
  promptButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
