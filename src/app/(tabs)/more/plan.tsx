import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { CourseCatalogPicker } from '@/components/course-catalog-picker';
import { EntityRow } from '@/components/entity-row';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { RecognizedCreditFormModal } from '@/components/recognized-credit-form-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import {
  COURSE_STATUS_LABELS,
  COURSE_STATUS_TONES,
  DEGREE_CREDITS_TARGET,
  RECOGNIZED_CREDIT_TYPE_LABELS,
  SEMESTERS,
} from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import { degreeStats } from '@/data/stats';
import { recognizedCreditsTotal, useCourses, useRecognizedCredits } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Course, RecognizedCredit, Semester } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export default function PlanScreen() {
  const courses = useCourses();
  const recognizedCredits = useRecognizedCredits();
  const screenPadding = useScreenPadding();
  const current = useMemo(() => getCurrentSemester(), []);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [recognizedFormOpen, setRecognizedFormOpen] = useState(false);
  const [editingRecognizedCredit, setEditingRecognizedCredit] = useState<RecognizedCredit | undefined>();

  const recognizedTotal = useMemo(() => recognizedCreditsTotal(recognizedCredits), [recognizedCredits]);
  const degree = useMemo(() => degreeStats(courses, current, recognizedTotal), [courses, current, recognizedTotal]);
  const showPastCoursesNudge = courses.length > 0 && degree.passedCount === 0;

  function openNewRecognizedCredit() {
    setEditingRecognizedCredit(undefined);
    setRecognizedFormOpen(true);
  }

  function openRecognizedCredit(item: RecognizedCredit) {
    setEditingRecognizedCredit(item);
    setRecognizedFormOpen(true);
  }

  const sections = useMemo(() => {
    const groups = new Map<string, { year: number; semester: Semester | '—'; courses: Course[] }>();

    courses.forEach((course) => {
      const year = course.year ?? 0;
      const semester = course.semester ?? '—';
      const key = `${year}-${semester}`;
      if (!groups.has(key)) groups.set(key, { year, semester, courses: [] });
      groups.get(key)!.courses.push(course);
    });

    return Array.from(groups.values())
      .sort((a, b) => a.year - b.year || SEMESTERS.indexOf(a.semester as Semester) - SEMESTERS.indexOf(b.semester as Semester))
      .map((group) => ({
        title: `${group.year} · סמסטר ${group.semester}`,
        data: group.courses,
      }));
  }, [courses]);

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(course) => course.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <ThemedView type="card" className="border-border" style={styles.progressCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                התקדמות בתואר
              </ThemedText>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {degree.completedCredits}/{DEGREE_CREDITS_TARGET} נק״ז
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
                {degree.passedCredits} מקורסים · {recognizedTotal} נק״ז מוכרות
              </ThemedText>
            </ThemedView>

            {recognizedCredits.length > 0 && (
              <View style={styles.recognizedSection}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  נק״ז מוכרות · {recognizedTotal}
                </ThemedText>
                {recognizedCredits.map((item) => (
                  <Pressable key={item.id} onPress={() => openRecognizedCredit(item)}>
                    {({ pressed }) => (
                      <View style={pressed && styles.pressed}>
                        <EntityRow
                          title={RECOGNIZED_CREDIT_TYPE_LABELS[item.type]}
                          subtitle={[item.year, item.note].filter(Boolean).join(' · ') || undefined}
                          trailing={<ThemedText type="smallBold">{item.credits} נק״ז ›</ThemedText>}
                        />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            <SheetButton label="＋ הוספה" onPress={() => setShowAddMenu(true)} />

            {showPastCoursesNudge && (
              <Pressable
                onPress={() => {
                  posthog.capture('plan_add_past_courses_nudge_tapped');
                  setShowCatalogPicker(true);
                }}>
                <ThemedView type="accentSoft" style={styles.nudge}>
                  <ThemedText type="smallBold" themeColor="accent" style={styles.nudgeText}>
                    רוצה לראות התקדמות בתואר? הוסיפו קורסים שכבר עברת 🧭
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.timelineRow}>
            <View style={styles.rail}>
              <ThemedView type="border" style={styles.railLine} />
              <ThemedView type="accent" style={styles.railDotHeader} />
            </View>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            </ThemedView>
          </View>
        )}
        renderItem={({ item }) => {
          const status = deriveCourseStatus(item, current);
          return (
            <View style={styles.timelineRow}>
              <View style={styles.rail}>
                <ThemedView type="border" style={styles.railLine} />
                <ThemedView type="border" style={styles.railDot} />
              </View>
              <View style={styles.rowContent}>
                <EntityRow
                  title={item.name}
                  subtitle={[item.courseNumber, item.faculty].filter(Boolean).join(' · ')}
                  trailing={<Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />}
                  href={`/courses/${item.id}`}
                  onPress={() => posthog.capture('plan_row_tapped', { course_id: item.id })}
                />
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={styles.separatorRow}>
            <View style={styles.rail}>
              <ThemedView type="border" style={styles.railLine} />
            </View>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          screenPadding,
        ]}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין קורסים בתוכנית הלימודים
          </ThemedText>
        }
      />

      <CourseCatalogPicker
        visible={showCatalogPicker}
        onClose={() => setShowCatalogPicker(false)}
        onAdded={() => setShowCatalogPicker(false)}
        source="plan"
      />

      <FormSheet visible={showAddMenu} onClose={() => setShowAddMenu(false)} title="מה להוסיף?">
        <View style={styles.addMenu}>
          <Pressable
            onPress={() => {
              setShowAddMenu(false);
              setShowCatalogPicker(true);
            }}>
            <EntityRow title="📚 קורס מהקטלוג" subtitle="הוספת קורס לתוכנית" trailing={<ThemedText>‹</ThemedText>} />
          </Pressable>
          <Pressable
            onPress={() => {
              setShowAddMenu(false);
              openNewRecognizedCredit();
            }}>
            <EntityRow
              title="🎓 נק״ז מוכרות"
              subtitle="לימודים קודמים, פעילות חברתית ומילואים"
              trailing={<ThemedText>‹</ThemedText>}
            />
          </Pressable>
        </View>
      </FormSheet>

      <RecognizedCreditFormModal
        visible={recognizedFormOpen}
        onClose={() => setRecognizedFormOpen(false)}
        item={editingRecognizedCredit}
      />
    </ThemedView>
  );
}

const RAIL_WIDTH = 28;
const RAIL_LINE_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  progressCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  recognizedSection: { gap: Spacing.two },
  nudge: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  nudgeText: {
    textAlign: rtlTextAlign.start,
  },
  listContent: {
    padding: Spacing.three,
  },
  timelineRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'stretch',
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: (RAIL_WIDTH - RAIL_LINE_WIDTH) / 2,
    width: RAIL_LINE_WIDTH,
  },
  railDotHeader: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  railDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  sectionTitle: {
    textAlign: rtlTextAlign.start,
  },
  rowContent: {
    flex: 1,
  },
  separatorRow: {
    flexDirection: rtlFlexDirection.row,
    height: Spacing.two,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
  addMenu: { gap: Spacing.two },
  pressed: { opacity: 0.7 },
});
