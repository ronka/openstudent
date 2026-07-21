import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { CourseFormModal } from '@/components/course-form-modal';
import { CourseStatusModal } from '@/components/course-status-modal';
import { EntityRow } from '@/components/entity-row';
import { ExamFormModal } from '@/components/exam-form-modal';
import { SheetButton } from '@/components/form-sheet';
import { NotFoundView } from '@/components/not-found-view';
import { Section } from '@/components/section';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import {
  assignmentsCollection,
  coursesCollection,
  useAssignmentsByCourse,
  useCourse,
  useExamsByCourse,
} from '@/data/store';
import type { Exam } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const course = useCourse(id);
  const assignments = useAssignmentsByCourse(id);
  const exams = useExamsByCourse(id);
  const current = useMemo(() => getCurrentSemester(), []);
  const screenPadding = useScreenPadding();

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>(undefined);

  if (!course) {
    return <NotFoundView title="קורס" message="הקורס לא נמצא" />;
  }

  const status = deriveCourseStatus(course, current);
  const meta = [
    course.courseNumber,
    course.faculty,
    course.credits !== undefined ? `${course.credits} נ״ז` : undefined,
    course.type,
    course.level ? `רמה ${course.level}` : undefined,
    course.semester ? `סמסטר ${course.semester}׳` : undefined,
    course.year !== undefined ? String(course.year) : undefined,
  ].filter((item): item is string => Boolean(item));
  // What auto-derivation would pick if the manual override were cleared — shown on the
  // "אוטומטי" row so the user can see where reverting lands.
  const autoStatus = deriveCourseStatus({ ...course, statusOverride: undefined }, current);

  function openCreateExam() {
    setEditingExam(undefined);
    setShowExamForm(true);
  }

  function openEditExam(exam: Exam) {
    setEditingExam(exam);
    setShowExamForm(true);
  }

  function handleDelete() {
    if (!course) return;
    Alert.alert('מחיקת קורס', `למחוק את "${course.name}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => {
          coursesCollection.remove(course.id);
          posthog.capture('course_deleted', { course_id: course.id, source: 'course_detail' });
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: screenPadding.paddingBottom }]}>
        <ThemedView type="backgroundElement" style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="subtitle" style={styles.name}>
              {course.name}
            </ThemedText>
            <Pressable onPress={() => setShowStatusModal(true)} style={({ pressed }) => pressed && styles.pressed}>
              <Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />
            </Pressable>
          </View>

          {/* Wrapping run of facts, so short values don't each claim a full row and the
              header stays compact whatever the catalog provides. Separated by spacing
              rather than dots — a dot separator dangles at the start of a wrapped line. */}
          <View style={styles.metaRow}>
            {meta.map((item) => (
              <ThemedText key={item} type="small" themeColor="textSecondary">
                {item}
              </ThemedText>
            ))}
          </View>

          {(course.grade !== undefined || course.binaryPass) && (
            <View style={styles.badgeRow}>
              {course.grade !== undefined && <Badge label={`ציון ${course.grade}`} tone="neutral" />}
              {course.binaryPass && <Badge label="עובר בינארי · לא בממוצע" tone="info" />}
            </View>
          )}

          {course.notes && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notes}>
              {course.notes}
            </ThemedText>
          )}

          <View style={styles.actions}>
            <SheetButton label="עריכה" size="sm" onPress={() => setShowCourseForm(true)} />
          </View>
        </ThemedView>

        <Section title="מטלות" emptyLabel="אין מטלות לקורס זה" isEmpty={assignments.length === 0}>
          {assignments.map((assignment) => {
            const checked = assignment.status === 'done';
            return (
              <EntityRow
                key={assignment.id}
                title={assignment.name}
                subtitle={assignment.dueDate}
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
                        source: 'course_detail',
                      });
                    }}
                  />
                }
                href={`/assignments/${assignment.id}`}
              />
            );
          })}
        </Section>

        <Section
          title="מבחנים"
          emptyLabel="אין מבחנים לקורס זה"
          isEmpty={exams.length === 0}
          action={
            <ThemedText type="link" themeColor="textSecondary" onPress={openCreateExam}>
              + הוספה
            </ThemedText>
          }>
          {exams.map((exam) => (
            <Pressable
              key={exam.id}
              onPress={() => openEditExam(exam)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={styles.rowMain}>
                  <ThemedText style={styles.rowTitle}>{exam.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {exam.date}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{exam.grade !== undefined ? exam.grade : '—'}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </Section>

        {/* Destructive action lives at the very bottom, as a quiet link — it should be
            reachable but never compete with the course's own content for attention. */}
        <Pressable onPress={handleDelete} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="link" className="text-destructive" style={styles.deleteLink}>
            מחיקת הקורס
          </ThemedText>
        </Pressable>
      </ScrollView>

      <CourseStatusModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        override={course.statusOverride}
        derived={autoStatus}
        onSelect={(next) => {
          coursesCollection.update(course.id, { statusOverride: next });
          posthog.capture('course_status_changed', { course_id: course.id, to_status: next, source: 'manual' });
        }}
        onClear={() => {
          coursesCollection.update(course.id, { statusOverride: undefined });
          posthog.capture('course_status_changed', { course_id: course.id, to_status: 'auto', source: 'manual' });
        }}
      />

      <CourseFormModal visible={showCourseForm} onClose={() => setShowCourseForm(false)} course={course} />

      <ExamFormModal
        visible={showExamForm}
        onClose={() => setShowExamForm(false)}
        initialCourseId={course.id}
        exam={editingExam}
        source="course_detail"
      />
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
  header: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  headerTop: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
  metaRow: {
    flexDirection: rtlFlexDirection.row,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  badgeRow: {
    flexDirection: rtlFlexDirection.row,
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  notes: {
    textAlign: rtlTextAlign.start,
  },
  deleteLink: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
  actions: {
    flexDirection: rtlFlexDirection.row,
    // Hug the buttons' content at the start edge instead of stretching them full-width.
    // Plain `flex-start` — the app runs under forced native RTL, which already flips
    // the cross-axis edges, so `rtlAlign` here would flip them a second time.
    alignSelf: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.two,
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
  pressed: {
    opacity: 0.7,
  },
});
