import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCatalogList } from '@/components/course-catalog-list';
import { DashboardCard } from '@/components/dashboard-card';
import { DateField } from '@/components/date-field';
import { ChipField, ThemedTextInput } from '@/components/form-fields';
import { buildAssignmentPayloads, buildPendingTasks, QuickTasksForm, type PendingTask } from '@/components/quick-tasks-form';
import { TaskCheckbox } from '@/components/task-checkbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { catalogEntryByNumber, type CourseCatalogEntry } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { markOnboardingComplete } from '@/data/onboarding';
import { setName } from '@/data/profile';
import { deriveCourseStatus, getCurrentSemester, getYearOptions } from '@/data/semester';
import { assignmentsCollection, coursesCollection, examsCollection } from '@/data/store';
import type { Assignment, Course, Exam, Semester } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlAlign, rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type StruggleKey = 'deadlines' | 'progress';

const STRUGGLE_OPTIONS: { key: StruggleKey; emoji: string; label: string }[] = [
  { key: 'deadlines', emoji: '📅', label: 'לא לפספס תאריכי הגשה' },
  { key: 'progress', emoji: '🧭', label: 'לדעת איפה אני עומד בתואר' },
];

const REFLECTION_COPY: Record<StruggleKey, string> = {
  deadlines: 'קיבלנו. אף תאריך הגשה לא יתפספס יותר — כל מטלה עם דדליין במקום אחד.',
  progress: 'קיבלנו. תמיד תדעו בדיוק כמה נק״ז נשארו ומה הממוצע — בלי אקסל.',
};

/** Summary-screen echo of the screen-2 answer, tying the finished setup back to it. */
const SUMMARY_MIRROR_COPY: Record<StruggleKey, string> = {
  deadlines: '🎯 מעכשיו כל תאריך הגשה מחכה לכם כאן — לא יותר בלגן בין מיילים.',
  progress: '🎯 מעכשיו תדעו תמיד איפה אתם עומדים בתואר — במקום אחד.',
};

/** Total onboarding screens in the finished flow (§4) — dots render for all six even
 * before later steps exist, so Tasks 4–6 only need to add step branches, not this UI. */
const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const current = useMemo(() => getCurrentSemester(), []);

  const [step, setStep] = useState(1);
  const [name, setNameInput] = useState('');
  const [struggle, setStruggle] = useState<StruggleKey | null>(null);

  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);
  const [editingSemester, setEditingSemester] = useState(false);

  const [createdCourses, setCreatedCourses] = useState<{ id: string; name: string }[]>([]);
  const [courseLoopIndex, setCourseLoopIndex] = useState(0);
  const [loopMamanCount, setLoopMamanCount] = useState(0);
  const [loopMamachCount, setLoopMamachCount] = useState(0);
  const [loopPending, setLoopPending] = useState<PendingTask[]>([]);
  const [loopExamDate, setLoopExamDate] = useState('');

  const [createdAssignments, setCreatedAssignments] = useState<Assignment[]>([]);
  const [createdExams, setCreatedExams] = useState<Exam[]>([]);

  const nearestDueDate = useMemo(() => {
    const dueDates = createdAssignments.map((assignment) => assignment.dueDate).filter((date): date is string => !!date);
    return dueDates.length > 0 ? [...dueDates].sort((a, b) => a.localeCompare(b))[0] : null;
  }, [createdAssignments]);

  useEffect(() => {
    posthog.capture('onboarding_started');
  }, []);

  function finish() {
    setStep(7);
  }

  function handleNameSubmit() {
    posthog.capture('onboarding_name_submitted');
    setStep(3);
  }

  function handleSelectStruggle(key: StruggleKey) {
    setStruggle(key);
    posthog.capture('onboarding_struggle_selected', { struggle: key });
  }

  function completeOnboarding() {
    setName(name);
    markOnboardingComplete();
    posthog.capture('onboarding_completed', {
      struggle,
      course_count: createdCourses.length,
      assignment_count: createdAssignments.length,
      exam_count: createdExams.length,
    });
  }

  function toggleCourse(entry: CourseCatalogEntry) {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(entry.courseNumber)) next.delete(entry.courseNumber);
      else next.add(entry.courseNumber);
      return next;
    });
  }

  function finishWithCourses() {
    const now = Date.now();
    const created = Array.from(selectedCourses).map((courseNumber, index) => {
      const entry = catalogEntryByNumber(courseNumber)!;
      const course: Course = {
        id: `c-${now}-${index}`,
        name: entry.name,
        courseNumber: entry.courseNumber,
        faculty: entry.faculty,
        credits: entry.credits,
        type: entry.type,
        level: entry.level,
        status: deriveCourseStatus({ year, semester, grade: undefined }, current),
        year,
        semester,
      };
      coursesCollection.add(course);
      return { id: course.id, name: course.name };
    });

    if (created.length === 0) {
      finish();
      return;
    }
    setCreatedCourses(created);
    setCourseLoopIndex(0);
    resetLoopForm();
    setStep(6);
  }

  function resetLoopForm() {
    setLoopMamanCount(0);
    setLoopMamachCount(0);
    setLoopPending([]);
    setLoopExamDate('');
  }

  function handleLoopMamanCountChange(count: number) {
    setLoopMamanCount(count);
    setLoopPending(buildPendingTasks(count, loopMamachCount));
  }

  function handleLoopMamachCountChange(count: number) {
    setLoopMamachCount(count);
    setLoopPending(buildPendingTasks(loopMamanCount, count));
  }

  function handleLoopPendingDueDateChange(index: number, dueDate: string) {
    setLoopPending((prev) => prev.map((task, i) => (i === index ? { ...task, dueDate } : task)));
  }

  function advanceCourseLoop() {
    const nextIndex = courseLoopIndex + 1;
    resetLoopForm();
    if (nextIndex >= createdCourses.length) {
      finish();
    } else {
      setCourseLoopIndex(nextIndex);
    }
  }

  function saveCourseLoopStep() {
    const course = createdCourses[courseLoopIndex];
    if (loopPending.length > 0) {
      const payloads = buildAssignmentPayloads(course.id, loopPending);
      assignmentsCollection.addMany(payloads);
      setCreatedAssignments((prev) => [...prev, ...payloads]);
    }
    if (loopExamDate) {
      const exam: Exam = { id: `e-${Date.now()}-${courseLoopIndex}`, title: course.name, courseId: course.id, date: loopExamDate };
      examsCollection.add(exam);
      setCreatedExams((prev) => [...prev, exam]);
    }
    posthog.capture('onboarding_course_added', {
      assignment_count: loopPending.length,
      has_exam_date: !!loopExamDate,
    });
    advanceCourseLoop();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four }]}>
      <ProgressDots current={step} total={TOTAL_STEPS} />

      {step === 1 && (
        <OnboardingStep
          headline="כל התואר שלך. מקום אחד. 🎓"
          body="ממ״נים, ממ״חים ומועדי בחינות — מפוזרים בין מיילים, אקסלים והזיכרון. OpenStudent מסדר את הסמסטר בשבילך."
          primaryLabel="בואו נתחיל"
          onPrimary={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <OnboardingStep
          headline="איך קוראים לך?"
          body="ככה נוכל לדבר איתך בגובה העיניים."
          primaryLabel="נעים להכיר"
          primaryDisabled={!name.trim()}
          onPrimary={handleNameSubmit}>
          <View style={styles.nameField}>
            <ThemedTextInput value={name} onChangeText={setNameInput} placeholder="השם שלך" />
          </View>
        </OnboardingStep>
      )}

      {step === 3 && (
        <OnboardingStep
          headline="מה הכי מציק לך בלימודים?"
          primaryLabel="המשך"
          primaryDisabled={!struggle}
          onPrimary={() => setStep(4)}>
          <View style={styles.optionList}>
            {STRUGGLE_OPTIONS.map((option) => {
              const selected = struggle === option.key;
              return (
                <Pressable key={option.key} onPress={() => handleSelectStruggle(option.key)}>
                  <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.optionRow}>
                    <ThemedText style={styles.optionEmoji}>{option.emoji}</ThemedText>
                    <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                    <TaskCheckbox checked={selected} onToggle={() => handleSelectStruggle(option.key)} />
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        </OnboardingStep>
      )}

      {step === 4 && struggle && (
        <OnboardingStep
          headline={REFLECTION_COPY[struggle]}
          body="נתחיל מהסמסטר הנוכחי — זה לוקח דקה."
          primaryLabel="יאללה"
          onPrimary={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(120)} style={styles.step4Container}>
          <View style={styles.step4Body}>
            <ThemedText type="subtitle" style={styles.headline}>
              אילו קורסים לומדים הסמסטר? 📖
            </ThemedText>

            <Pressable onPress={() => setEditingSemester((value) => !value)}>
              <ThemedView type="accentSoft" style={styles.semesterPill}>
                <ThemedText type="smallBold" themeColor="accent">
                  {`סמסטר ${semester}׳ · ${year}`}
                </ThemedText>
              </ThemedView>
            </Pressable>

            {editingSemester && (
              <View style={styles.semesterEditor}>
                <ChipField
                  label="סמסטר"
                  options={SEMESTERS}
                  getLabel={(option) => option}
                  isSelected={(option) => semester === option}
                  onSelect={setSemester}
                />
                <ChipField
                  label="שנה"
                  scroll
                  options={YEAR_OPTIONS}
                  getLabel={String}
                  isSelected={(option) => year === option}
                  onSelect={setYear}
                />
              </View>
            )}

            <CourseCatalogList
              selected={selectedCourses}
              onToggle={toggleCourse}
              style={styles.step4CatalogWrapper}
              listStyle={styles.step4List}
            />
          </View>

          <View style={styles.step4Footer}>
            <Pressable
              onPress={finishWithCourses}
              disabled={selectedCourses.size === 0}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={selectedCourses.size === 0 ? 'backgroundElement' : 'text'} style={styles.primaryButton}>
                <ThemedText
                  type="smallBold"
                  themeColor={selectedCourses.size === 0 ? 'textSecondary' : 'background'}
                  style={styles.primaryButtonText}>
                  {`המשך עם ${selectedCourses.size} קורסים`}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={finish}>
              <ThemedText type="link" themeColor="textSecondary" style={styles.skipLinkText}>
                אין לי קורסים כרגע
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {step === 6 && createdCourses[courseLoopIndex] && (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(120)} style={styles.step4Container}>
          <ScrollView contentContainerStyle={styles.step5Body} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle" style={styles.headline}>
              {`קורס ${courseLoopIndex + 1}/${createdCourses.length} · ${createdCourses[courseLoopIndex].name}`}
            </ThemedText>

            <ThemedText type="smallBold" style={styles.sectionLabel}>
              מטלות ✍️
            </ThemedText>
            <QuickTasksForm
              step="select"
              mamanCount={loopMamanCount}
              mamachCount={loopMamachCount}
              onMamanCountChange={handleLoopMamanCountChange}
              onMamachCountChange={handleLoopMamachCountChange}
              pending={loopPending}
              onPendingDueDateChange={handleLoopPendingDueDateChange}
            />
            {loopPending.length > 0 && (
              <QuickTasksForm
                step="review"
                mamanCount={loopMamanCount}
                mamachCount={loopMamachCount}
                onMamanCountChange={handleLoopMamanCountChange}
                onMamachCountChange={handleLoopMamachCountChange}
                pending={loopPending}
                onPendingDueDateChange={handleLoopPendingDueDateChange}
              />
            )}

            <ThemedText type="smallBold" style={styles.sectionLabel}>
              מבחן 🗓️
            </ThemedText>
            <DateField label="מתי המבחן? (אפשר לדלג)" value={loopExamDate || undefined} onChange={setLoopExamDate} optional />
          </ScrollView>

          <View style={styles.step4Footer}>
            <Pressable onPress={saveCourseLoopStep} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="text" style={styles.primaryButton}>
                <ThemedText type="smallBold" themeColor="background" style={styles.primaryButtonText}>
                  שמור והמשך
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={advanceCourseLoop}>
              <ThemedText type="link" themeColor="textSecondary" style={styles.skipLinkText}>
                דלג על הקורס הזה
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {step === 7 && (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(120)} style={styles.step}>
          <ScrollView contentContainerStyle={styles.stepBody}>
            {createdCourses.length === 0 ? (
              <>
                <ThemedText type="subtitle" style={styles.headline}>
                  מתחילים נקי 🌱
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.body}>
                  אין עדיין קורסים במערכת — אפשר להוסיף אותם בכל שלב מ״תוכנית״, ומשם נדאג שלא תפספסו כלום.
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText type="subtitle" style={styles.headline}>
                  הסמסטר שלך מוכן ✨
                </ThemedText>
                <DashboardCard>
                  <ThemedText type="smallBold" style={styles.sectionLabel}>
                    {`📖 ${createdCourses.length} קורסים · ✍️ ${createdAssignments.length} מטלות · 🗓️ ${createdExams.length} מבחנים`}
                  </ThemedText>
                  {nearestDueDate && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                      {`המטלה הקרובה ביותר: ${nearestDueDate}`}
                    </ThemedText>
                  )}
                </DashboardCard>
                {struggle && (
                  <ThemedText themeColor="textSecondary" style={styles.body}>
                    {SUMMARY_MIRROR_COPY[struggle]}
                  </ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
                  קורסים שכבר עברתם? אפשר להוסיף אותם בכל שלב מ״תוכנית״, כדי לראות התקדמות מלאה בתואר.
                </ThemedText>
              </>
            )}
          </ScrollView>

          <Pressable onPress={completeOnboarding} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="text" style={styles.primaryButton}>
              <ThemedText type="smallBold" themeColor="background" style={styles.primaryButtonText}>
                לדשבורד →
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// A handful of years around "now" — enough range for planning ahead/behind.
const YEAR_OPTIONS = getYearOptions();

function OnboardingStep({
  headline,
  body,
  children,
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: {
  headline: string;
  body?: string;
  children?: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(120)} style={styles.step}>
      <View style={styles.stepBody}>
        <ThemedText type="subtitle" style={styles.headline}>
          {headline}
        </ThemedText>
        {body && (
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {body}
          </ThemedText>
        )}
        {children}
      </View>

      <Pressable onPress={onPrimary} disabled={primaryDisabled} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type={primaryDisabled ? 'backgroundElement' : 'text'} style={styles.primaryButton}>
          <ThemedText type="smallBold" themeColor={primaryDisabled ? 'textSecondary' : 'background'} style={styles.primaryButtonText}>
            {primaryLabel}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, index) => index + 1).map((dotStep) => (
        <ThemedView key={dotStep} type={dotStep === current ? 'accent' : 'border'} style={styles.dot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  dotsRow: {
    flexDirection: rtlFlexDirection.row,
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  step: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stepBody: {
    gap: Spacing.three,
  },
  headline: {
    textAlign: rtlTextAlign.start,
  },
  body: {
    textAlign: rtlTextAlign.start,
  },
  nameField: {
    marginTop: Spacing.two,
  },
  optionList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  optionRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionLabel: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    textAlign: rtlTextAlign.center,
  },
  pressed: {
    opacity: 0.7,
  },
  step4Container: {
    flex: 1,
  },
  step4Body: {
    flex: 1,
    gap: Spacing.three,
    minHeight: 0,
  },
  step4CatalogWrapper: {
    flex: 1,
    minHeight: 0,
  },
  step4List: {
    flex: 1,
  },
  step4Footer: {
    gap: Spacing.three,
  },
  step5Body: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sectionLabel: {
    textAlign: rtlTextAlign.start,
  },
  semesterPill: {
    alignSelf: rtlAlign.start,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  semesterEditor: {
    gap: Spacing.two,
  },
  skipLinkText: {
    textAlign: rtlTextAlign.center,
  },
});
