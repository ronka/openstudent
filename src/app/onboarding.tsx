import { Image } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { COURSE_CATALOG, type CourseCatalogEntry } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { reconcileNotifications } from '@/data/notification-scheduler';
import { enableNotifications, markPromptSeen } from '@/data/notification-settings';
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

/** Shown on screen-3 reflection when both goals are selected — one line instead of two. */
const REFLECTION_COPY_BOTH =
  'קיבלנו. אף תאריך הגשה לא יתפספס, ותמיד תדעו איפה אתם עומדים בתואר — הכול במקום אחד.';

/** Summary-screen echo of the screen-2 answer, tying the finished setup back to it. */
const SUMMARY_MIRROR_COPY: Record<StruggleKey, string> = {
  deadlines: '🎯 מעכשיו כל תאריך הגשה מחכה לכם כאן — לא יותר בלגן בין מיילים.',
  progress: '🎯 מעכשיו תדעו תמיד איפה אתם עומדים בתואר — במקום אחד.',
};

const SUMMARY_MIRROR_COPY_BOTH =
  '🎯 מעכשיו כל תאריך הגשה מחכה לכם כאן ותמיד תדעו איפה אתם עומדים בתואר — הכול במקום אחד.';

/** Picks the reflection/summary line for the chosen goals: a combined line when both are
 * selected, the single-goal line otherwise. Order-independent (works on a Set). */
function copyForStruggles(struggles: Set<StruggleKey>, single: Record<StruggleKey, string>, both: string): string {
  if (struggles.has('deadlines') && struggles.has('progress')) return both;
  if (struggles.has('deadlines')) return single.deadlines;
  return single.progress;
}

/** Widgets are iOS-only (`expo-widgets` has no Android target — see src/widgets/updater.ts), so the
 * widgets pitch (step 8) only appears on iOS. */
const IS_IOS = Platform.OS === 'ios';

/** Total onboarding screens in the finished flow (§4). Step 7 is the notifications opt-in, step 8
 * the iOS-only widgets pitch, step 9 the summary. On non-iOS the widgets step is skipped, so the
 * flow — and the progress dots — are one shorter. */
const TOTAL_STEPS = IS_IOS ? 9 : 8;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const current = useMemo(() => getCurrentSemester(), []);

  const [step, setStep] = useState(1);
  const [name, setNameInput] = useState('');
  const [struggles, setStruggles] = useState<Set<StruggleKey>>(new Set());

  // Capture-at-selection: the tapped search-result row *is* the entry, keyed by
  // courseNumber so re-tapping toggles it off. Storing the entry (not just the number)
  // means finishing the step never needs to re-resolve against the catalog.
  const [selectedCourses, setSelectedCourses] = useState<Map<string, CourseCatalogEntry>>(new Map());
  const selectedCourseNumbers = useMemo(() => new Set(selectedCourses.keys()), [selectedCourses]);
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);
  const [editingSemester, setEditingSemester] = useState(false);

  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
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

  useEffect(() => {
    if (step === 8 && IS_IOS) posthog.capture('onboarding_widgets_shown');
  }, [step]);

  function finish() {
    // Step 7 is the notifications opt-in; the (iOS-only) widgets pitch and summary follow.
    setStep(7);
  }

  async function handleEnableNotifications() {
    // Advance regardless of the OS permission outcome — a denial isn't a dead end, the
    // settings toggle is the recovery path. Marking the prompt seen means existing-user
    // dashboard nudge never double-asks someone who went through onboarding.
    await enableNotifications();
    markPromptSeen();
    posthog.capture('onboarding_notifications_enabled');
    setStep(IS_IOS ? 8 : 9);
  }

  function skipNotifications() {
    markPromptSeen();
    posthog.capture('onboarding_notifications_skipped');
    setStep(IS_IOS ? 8 : 9);
  }

  function handleNameSubmit() {
    posthog.capture('onboarding_name_submitted');
    setStep(3);
  }

  function handleToggleStruggle(key: StruggleKey) {
    const selected = !struggles.has(key);
    setStruggles((prev) => {
      const next = new Set(prev);
      if (selected) next.add(key);
      else next.delete(key);
      return next;
    });
    // Fire only on select — the event name means "a goal was picked"; toggling one off
    // is not a selection and must not inflate the count.
    if (selected) posthog.capture('onboarding_struggle_selected', { struggle: key });
  }

  function completeOnboarding() {
    // Nothing is persisted during the flow; flush the whole plan atomically here, right
    // before the app un-gates, so bailing out mid-onboarding never leaves orphan rows.
    coursesCollection.addMany(createdCourses);
    assignmentsCollection.addMany(createdAssignments);
    examsCollection.addMany(createdExams);
    setName(name);
    markOnboardingComplete();
    // The debounced collection subscriber would catch this flush too; reconcile now so
    // reminders for the just-created items are scheduled immediately.
    void reconcileNotifications();
    posthog.capture('onboarding_completed', {
      struggles: Array.from(struggles),
      course_count: createdCourses.length,
      assignment_count: createdAssignments.length,
      exam_count: createdExams.length,
    });
  }

  function toggleCourse(entry: CourseCatalogEntry) {
    setSelectedCourses((prev) => {
      const next = new Map(prev);
      if (next.has(entry.courseNumber)) next.delete(entry.courseNumber);
      else next.set(entry.courseNumber, entry);
      return next;
    });
  }

  function finishWithCourses() {
    const now = Date.now();
    const created = Array.from(selectedCourses.values()).map((entry, index) => {
      const course: Course = {
        id: `c-${now}-${index}`,
        name: entry.name,
        courseNumber: entry.courseNumber,
        faculty: entry.faculty[0],
        credits: entry.credits,
        type: entry.type,
        level: entry.level,
        status: deriveCourseStatus({ year, semester, grade: undefined }, current),
        year,
        semester,
      };
      return course; // held locally; persisted only in completeOnboarding
    });

    if (created.length === 0) {
      finish();
      return;
    }
    setCreatedCourses(created);
    setCreatedAssignments([]);
    setCreatedExams([]);
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

  /** Drop the locally-built course plan so returning to the selection step (step 5) starts
   * fresh. Nothing is persisted until completeOnboarding, so this is a plain state reset —
   * no DB cleanup. `selectedCourses` is intentionally preserved so their picks are shown. */
  function resetCourseLoop() {
    setCreatedCourses([]);
    setCreatedAssignments([]);
    setCreatedExams([]);
    setCourseLoopIndex(0);
    resetLoopForm();
  }

  function goBack() {
    switch (step) {
      case 6:
      case 7:
      case 8:
      case 9:
        // The course loop (and the notifications + widgets + summary steps after it) is treated as one unit: Back returns
        // to course selection and drops the plan built on the way in, so re-picking — or
        // skipping — never carries stale rows into the final flush. Per-course task editing
        // happens later in-app (plan R1). `selectedCourses` is preserved, so the user lands
        // back on their picks.
        resetCourseLoop();
        setStep(5);
        return;
      default:
        // Linear steps 2–5 decrement; step 1 has no back (the control is hidden there).
        setStep((prev) => Math.max(1, prev - 1));
    }
  }

  function saveCourseLoopStep() {
    const course = createdCourses[courseLoopIndex];
    if (loopPending.length > 0) {
      const payloads = buildAssignmentPayloads(course.id, loopPending);
      setCreatedAssignments((prev) => [...prev, ...payloads]);
    }
    if (loopExamDate) {
      const exam: Exam = { id: `e-${Date.now()}-${courseLoopIndex}`, title: course.name, courseId: course.id, date: loopExamDate };
      setCreatedExams((prev) => [...prev, exam]);
    }
    posthog.capture('onboarding_course_added', {
      assignment_count: loopPending.length,
      has_exam_date: !!loopExamDate,
    });
    advanceCourseLoop();
  }

  return (
    <ThemedView
      type="background"
      style={[styles.root, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {step > 1 && (
            <Pressable
              onPress={goBack}
              hitSlop={12}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="text" style={styles.backText}>
                ‹ חזרה
              </ThemedText>
            </Pressable>
          )}
        </View>
        <ProgressDots current={!IS_IOS && step === 9 ? 8 : step} total={TOTAL_STEPS} />
        <View style={styles.headerSide} />
      </View>

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
          body="אפשר לבחור יותר מאחד."
          primaryLabel="המשך"
          primaryDisabled={struggles.size === 0}
          onPrimary={() => setStep(4)}>
          <View style={styles.optionList}>
            {STRUGGLE_OPTIONS.map((option) => {
              const selected = struggles.has(option.key);
              return (
                <Pressable key={option.key} onPress={() => handleToggleStruggle(option.key)}>
                  <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.optionRow}>
                    <ThemedText style={styles.optionEmoji}>{option.emoji}</ThemedText>
                    <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                    <TaskCheckbox checked={selected} onToggle={() => handleToggleStruggle(option.key)} />
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        </OnboardingStep>
      )}

      {step === 4 && struggles.size > 0 && (
        <OnboardingStep
          headline={copyForStruggles(struggles, REFLECTION_COPY, REFLECTION_COPY_BOTH)}
          body="נתחיל מהסמסטר הנוכחי — זה לוקח דקה."
          primaryLabel="יאללה"
          onPrimary={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <View style={styles.step4Container}>
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
              selected={selectedCourseNumbers}
              onToggle={toggleCourse}
              style={styles.step4CatalogWrapper}
              listStyle={styles.step4List}
              fallbackEntries={COURSE_CATALOG}
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
        </View>
      )}

      {step === 6 && createdCourses[courseLoopIndex] && (
        <View style={styles.step4Container}>
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
        </View>
      )}

      {step === 7 && (
        <View style={styles.step}>
          <View style={styles.stepBody}>
            <ThemedText type="subtitle" style={styles.headline}>
              🔔 שלא תפספסו הגשה
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              נשלח לכם תזכורת שבוע לפני ויום לפני כל מטלה ובחינה — בשעה 09:00, בול בזמן להתארגן.
            </ThemedText>
          </View>

          <View style={styles.step4Footer}>
            <Pressable onPress={handleEnableNotifications} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="text" style={styles.primaryButton}>
                <ThemedText type="smallBold" themeColor="background" style={styles.primaryButtonText}>
                  הפעילו תזכורות
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={skipNotifications}>
              <ThemedText type="link" themeColor="textSecondary" style={styles.skipLinkText}>
                אולי אחר כך
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {step === 8 && IS_IOS && (
        <View style={styles.step}>
          <ScrollView contentContainerStyle={styles.stepBody}>
            <ThemedText type="subtitle" style={styles.headline}>
              וידג׳טים למסך הבית 📲
            </ThemedText>
            <Image
              source={require('@/assets/images/widget-preview.png')}
              style={styles.widgetPreview}
              contentFit="contain"
            />
            <ThemedText themeColor="textSecondary" style={styles.body}>
              מוסיפים וידג׳ט למסך הבית ורואים הכול במבט אחד — בלי לפתוח את האפליקציה: מטלות קרובות,
              המבחן הבא, וההתקדמות בתואר.
            </ThemedText>
          </ScrollView>

          <Pressable onPress={() => setStep(9)} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="text" style={styles.primaryButton}>
              <ThemedText type="smallBold" themeColor="background" style={styles.primaryButtonText}>
                המשך
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      )}

      {step === 9 && (
        <View style={styles.step}>
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
                {struggles.size > 0 && (
                  <ThemedText themeColor="textSecondary" style={styles.body}>
                    {copyForStruggles(struggles, SUMMARY_MIRROR_COPY, SUMMARY_MIRROR_COPY_BOTH)}
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
        </View>
      )}
    </ThemedView>
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
    <View style={styles.step}>
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
    </View>
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
  header: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    marginBottom: Spacing.five,
    justifyContent: 'space-between',
  },
  headerSide: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: rtlAlign.start,
    paddingVertical: Spacing.one,
  },
  backText: {
    textAlign: rtlTextAlign.start,
  },
  dotsRow: {
    flexDirection: rtlFlexDirection.row,
    justifyContent: 'center',
    gap: Spacing.two,
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
  widgetPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
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
