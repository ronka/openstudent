import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { CourseFormModal } from '@/components/course-form-modal';
import { EntityRow } from '@/components/entity-row';
import { ExamFormModal } from '@/components/exam-form-modal';
import { ThemedTextInput } from '@/components/form-fields';
import { SheetButton } from '@/components/form-sheet';
import { NotFoundView } from '@/components/not-found-view';
import { Section } from '@/components/section';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_STATUS_LABELS, COURSE_STATUS_TONES } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import {
  assignmentsCollection,
  coursesCollection,
  materialsCollection,
  recordingsCollection,
  useAssignmentsByCourse,
  useCourse,
  useExamsByCourse,
  useMaterialsByCourse,
  useRecordingsByCourse,
} from '@/data/store';
import type { Exam } from '@/data/types';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const course = useCourse(id);
  const assignments = useAssignmentsByCourse(id);
  const exams = useExamsByCourse(id);
  const recordings = useRecordingsByCourse(id);
  const materials = useMaterialsByCourse(id);
  const current = useMemo(() => getCurrentSemester(), []);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>(undefined);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [materialName, setMaterialName] = useState('');

  if (!course) {
    return <NotFoundView title="קורס" message="הקורס לא נמצא" />;
  }

  const status = deriveCourseStatus(course, current);
  const recording = recordings[0];
  const recordingNumber = recording?.recordingNumber ?? 0;

  function bumpRecording(delta: number) {
    if (!course) return;
    const next = Math.max(0, recordingNumber + delta);
    if (recording) {
      recordingsCollection.update(recording.id, { recordingNumber: next });
    } else if (next > 0) {
      recordingsCollection.add({ id: `r-${Date.now()}`, name: 'הקלטה', recordingNumber: next, courseId: course.id });
    }
  }

  function openCreateExam() {
    setEditingExam(undefined);
    setShowExamForm(true);
  }

  function openEditExam(exam: Exam) {
    setEditingExam(exam);
    setShowExamForm(true);
  }

  function handleAddMaterial() {
    if (!course) return;
    const trimmedName = materialName.trim();
    if (!trimmedName) return;
    materialsCollection.add({
      id: `m-${Date.now()}`,
      name: trimmedName,
      courseId: course.id,
      assignmentIds: [],
      tags: [],
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setMaterialName('');
    setAddingMaterial(false);
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
          router.back();
        },
      },
    ]);
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
            <Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />
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

          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <SheetButton label="עריכה" onPress={() => setShowCourseForm(true)} />
            </View>
            <View style={styles.actionButton}>
              <SheetButton label="מחיקה" variant="destructive" onPress={handleDelete} />
            </View>
          </View>
        </View>

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
                    onToggle={() =>
                      assignmentsCollection.update(assignment.id, { status: checked ? 'todo' : 'done' })
                    }
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

        <Section title="הקלטות" emptyLabel="" isEmpty={false}>
          <ThemedView type="backgroundElement" style={styles.stepperRow}>
            <Pressable onPress={() => bumpRecording(-1)} disabled={recordingNumber === 0}>
              <ThemedView type="accentSoft" style={styles.stepperButton}>
                <ThemedText type="smallBold">−</ThemedText>
              </ThemedView>
            </Pressable>
            <ThemedText style={styles.stepperLabel}>{`הקלטה אחרונה: #${recordingNumber}`}</ThemedText>
            <Pressable onPress={() => bumpRecording(1)}>
              <ThemedView type="accentSoft" style={styles.stepperButton}>
                <ThemedText type="smallBold">+</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </Section>

        <Section
          title="חומרים"
          emptyLabel="אין חומרים לקורס זה"
          isEmpty={materials.length === 0 && !addingMaterial}
          action={
            <ThemedText type="link" themeColor="textSecondary" onPress={() => setAddingMaterial((value) => !value)}>
              + הוספת חומר
            </ThemedText>
          }>
          {addingMaterial && (
            <View style={styles.row}>
              <ThemedTextInput
                value={materialName}
                onChangeText={setMaterialName}
                placeholder="שם החומר"
                style={styles.rowMain}
              />
              <ThemedText type="link" onPress={handleAddMaterial}>
                הוספה
              </ThemedText>
            </View>
          )}
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

      <CourseFormModal visible={showCourseForm} onClose={() => setShowCourseForm(false)} course={course} />

      <ExamFormModal
        visible={showExamForm}
        onClose={() => setShowExamForm(false)}
        initialCourseId={course.id}
        exam={editingExam}
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
  actions: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
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
  stepperRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    textAlign: rtlTextAlign.center,
  },
});
