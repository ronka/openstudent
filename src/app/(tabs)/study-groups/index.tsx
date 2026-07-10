import { useFocusEffect } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

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
import { PLATFORM_EMOJI, PLATFORM_LABELS, type StudyGroupLink } from '@/data/study-groups';
import type { Semester } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const YEAR_OPTIONS = getYearOptions();

async function reportLink(link: StudyGroupLink, reason: string) {
  try {
    await fetch(`/api/study-groups/${link.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // Best-effort: the report action has no UI to surface a failure to.
  }
}

export default function StudyGroupsScreen() {
  const screenPadding = useScreenPadding();

  const [showForm, setShowForm] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string | undefined>(undefined);
  const [semesterFilter, setSemesterFilter] = useState<Semester | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  const [links, setLinks] = useState<StudyGroupLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/study-groups');
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data: StudyGroupLink[] = await response.json();
      setLinks(data);
    } catch {
      setError('שגיאה בטעינת הקבוצות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLinks({ silent: true });
    }, [fetchLinks])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchLinks({ silent: true });
  }

  const filteredLinks = useMemo(
    () =>
      links.filter((link) => {
        if (courseFilter && link.courseNumber !== courseFilter) return false;
        if (semesterFilter !== 'all' && link.semester !== semesterFilter) return false;
        if (yearFilter !== 'all' && link.year !== yearFilter) return false;
        return true;
      }),
    [links, courseFilter, semesterFilter, yearFilter]
  );

  function openLink(link: StudyGroupLink) {
    posthog.capture('study_group_link_opened', { link_id: link.id, course_number: link.courseNumber, platform: link.platform });
    openBrowserAsync(link.url);
  }

  function onReport(link: StudyGroupLink) {
    Alert.alert('דיווח על קישור', 'מה הבעיה?', [
      {
        text: 'לא עובד',
        onPress: () => {
          reportLink(link, 'not-working');
          posthog.capture('study_group_link_reported', { link_id: link.id, reason: 'not-working' });
        },
      },
      {
        text: 'לא רלוונטי',
        onPress: () => {
          reportLink(link, 'not-relevant');
          posthog.capture('study_group_link_reported', { link_id: link.id, reason: 'not-relevant' });
        },
      },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.chipRow}>
          <CatalogFilterChip
            selectedCourseNumber={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
              posthog.capture('study_group_filter_changed', { filter_type: 'course', value: id ?? 'all' });
            }}
            clearLabel="כל הקורסים"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="כל הסמסטרים"
            selected={semesterFilter === 'all'}
            onPress={() => {
              setSemesterFilter('all');
              posthog.capture('study_group_filter_changed', { filter_type: 'semester', value: 'all' });
            }}
          />
          {SEMESTERS.map((semester) => (
            <FilterChip
              key={semester}
              label={`סמסטר ${semester}`}
              selected={semesterFilter === semester}
              onPress={() => {
                setSemesterFilter(semester);
                posthog.capture('study_group_filter_changed', { filter_type: 'semester', value: semester });
              }}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="כל השנים"
            selected={yearFilter === 'all'}
            onPress={() => {
              setYearFilter('all');
              posthog.capture('study_group_filter_changed', { filter_type: 'year', value: 'all' });
            }}
          />
          {YEAR_OPTIONS.map((year) => (
            <FilterChip
              key={year}
              label={String(year)}
              selected={yearFilter === year}
              onPress={() => {
                setYearFilter(year);
                posthog.capture('study_group_filter_changed', { filter_type: 'year', value: year });
              }}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : error ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {error}
        </ThemedText>
      ) : (
        <FlatList
          data={filteredLinks}
          keyExtractor={(link) => link.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
      )}

      <Fab onPress={() => setShowForm(true)} />

      <SubmitGroupLinkForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmitted={() => fetchLinks({ silent: true })}
      />
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
  loading: {
    marginTop: Spacing.four,
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
