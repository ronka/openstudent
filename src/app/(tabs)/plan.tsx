import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { CourseCatalogPicker } from '@/components/course-catalog-picker';
import { EntityRow } from '@/components/entity-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { COURSE_STATUS_LABELS, COURSE_STATUS_TONES, SEMESTERS } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester } from '@/data/semester';
import { degreeStats } from '@/data/stats';
import { useCourses } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Course, Semester } from '@/data/types';
import { rtlTextAlign } from '@/utils/rtl';

export default function PlanScreen() {
  const courses = useCourses();
  const screenPadding = useScreenPadding();
  const current = useMemo(() => getCurrentSemester(), []);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const degree = useMemo(() => degreeStats(courses, current), [courses, current]);
  const showPastCoursesNudge = courses.length > 0 && degree.passedCount === 0;

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
      {showPastCoursesNudge && (
        <Pressable onPress={() => setShowCatalogPicker(true)} style={styles.nudgeWrapper}>
          <ThemedView type="accentSoft" style={styles.nudge}>
            <ThemedText type="smallBold" themeColor="accent" style={styles.nudgeText}>
              רוצה לראות התקדמות בתואר? הוסיפו קורסים שכבר עברת 🧭
            </ThemedText>
          </ThemedView>
        </Pressable>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(course) => course.id}
        renderSectionHeader={({ section }) => (
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
          </ThemedView>
        )}
        renderItem={({ item }) => {
          const status = deriveCourseStatus(item, current);
          return (
            <EntityRow
              title={item.name}
              subtitle={[item.courseNumber, item.faculty].filter(Boolean).join(' · ')}
              trailing={<Badge label={COURSE_STATUS_LABELS[status]} tone={COURSE_STATUS_TONES[status]} />}
              href={`/courses/${item.id}`}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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

      <CourseCatalogPicker visible={showCatalogPicker} onClose={() => setShowCatalogPicker(false)} onAdded={() => setShowCatalogPicker(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nudgeWrapper: {
    padding: Spacing.three,
    paddingBottom: 0,
  },
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
  sectionHeader: {
    paddingVertical: Spacing.two,
  },
  sectionTitle: {
    textAlign: rtlTextAlign.start,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
});
