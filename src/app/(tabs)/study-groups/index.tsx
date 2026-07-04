import { openBrowserAsync } from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Fab } from '@/components/capture-fab';
import { EntityRow } from '@/components/entity-row';
import { FilterChip } from '@/components/filter-chip';
import { CatalogFilterChip } from '@/components/study-group-course-filter';
import { SubmitGroupLinkForm } from '@/components/submit-group-link-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { catalogEntryByNumber } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { getYearOptions } from '@/data/semester';
import { PLATFORM_EMOJI, PLATFORM_LABELS, STUDY_GROUP_LINKS, type StudyGroupLink } from '@/data/study-groups';
import type { Semester } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const YEAR_OPTIONS = getYearOptions();

function reportLink(link: StudyGroupLink, reason: string) {
  console.log('report group link', { linkId: link.id, reason });
}

export default function StudyGroupsScreen() {
  const screenPadding = useScreenPadding();

  const [showForm, setShowForm] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string | undefined>(undefined);
  const [semesterFilter, setSemesterFilter] = useState<Semester | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  const filteredLinks = useMemo(
    () =>
      STUDY_GROUP_LINKS.filter((link) => {
        if (courseFilter && link.courseNumber !== courseFilter) return false;
        if (semesterFilter !== 'all' && link.semester !== semesterFilter) return false;
        if (yearFilter !== 'all' && link.year !== yearFilter) return false;
        return true;
      }),
    [courseFilter, semesterFilter, yearFilter]
  );

  function openLink(link: StudyGroupLink) {
    openBrowserAsync(link.url);
  }

  function onReport(link: StudyGroupLink) {
    Alert.alert('דיווח על קישור', 'מה הבעיה?', [
      { text: 'לא עובד', onPress: () => reportLink(link, 'not-working') },
      { text: 'לא רלוונטי', onPress: () => reportLink(link, 'not-relevant') },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.chipRow}>
          <CatalogFilterChip selectedCourseNumber={courseFilter} onChange={setCourseFilter} clearLabel="כל הקורסים" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="כל הסמסטרים"
            selected={semesterFilter === 'all'}
            onPress={() => setSemesterFilter('all')}
          />
          {SEMESTERS.map((semester) => (
            <FilterChip
              key={semester}
              label={`סמסטר ${semester}`}
              selected={semesterFilter === semester}
              onPress={() => setSemesterFilter(semester)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label="כל השנים" selected={yearFilter === 'all'} onPress={() => setYearFilter('all')} />
          {YEAR_OPTIONS.map((year) => (
            <FilterChip
              key={year}
              label={String(year)}
              selected={yearFilter === year}
              onPress={() => setYearFilter(year)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredLinks}
        keyExtractor={(link) => link.id}
        renderItem={({ item }) => {
          const courseName = catalogEntryByNumber(item.courseNumber)?.name ?? item.courseNumber;
          const subtitle = [item.courseNumber, `שנה ${item.year}`, `סמסטר ${item.semester}`].join(' · ');
          return (
            <Pressable onPress={() => openLink(item)} style={({ pressed }) => pressed && styles.pressed}>
              <EntityRow
                title={courseName}
                subtitle={subtitle}
                trailing={
                  <View style={styles.trailing}>
                    <Badge
                      label={`${PLATFORM_EMOJI[item.platform]} ${PLATFORM_LABELS[item.platform]}`}
                      tone={item.platform === 'whatsapp' ? 'success' : 'info'}
                    />
                    <Pressable onPress={() => onReport(item)} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedText style={styles.report}>🚩</ThemedText>
                    </Pressable>
                  </View>
                }
              />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: screenPadding.paddingBottom }]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין קבוצות תואמות
          </ThemedText>
        }
      />

      <Fab onPress={() => setShowForm(true)} />

      <SubmitGroupLinkForm visible={showForm} onClose={() => setShowForm(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  chipRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  listContent: {
    padding: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  trailing: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.two,
  },
  report: {
    fontSize: 18,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
