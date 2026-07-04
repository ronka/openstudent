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
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

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
      <SectionList
        sections={sections}
        keyExtractor={(course) => course.id}
        ListHeaderComponent={
          showPastCoursesNudge ? (
            <Pressable onPress={() => setShowCatalogPicker(true)} style={styles.nudgeWrapper}>
              <ThemedView type="accentSoft" style={styles.nudge}>
                <ThemedText type="smallBold" themeColor="accent" style={styles.nudgeText}>
                  רוצה לראות התקדמות בתואר? הוסיפו קורסים שכבר עברת 🧭
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : null
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

      <CourseCatalogPicker visible={showCatalogPicker} onClose={() => setShowCatalogPicker(false)} onAdded={() => setShowCatalogPicker(false)} />
    </ThemedView>
  );
}

const RAIL_WIDTH = 28;
const RAIL_LINE_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nudgeWrapper: {
    paddingBottom: Spacing.three,
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
});
