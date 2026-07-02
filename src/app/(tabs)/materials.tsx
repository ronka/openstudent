import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CaptureFab } from '@/components/capture-fab';
import { CourseFilterChip } from '@/components/course-select-modal';
import { FilterChip } from '@/components/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAssignments, useCourses, useMaterials } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import type { Material } from '@/data/types';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

function MaterialRow({
  material,
  courseName,
  assignmentNames,
}: {
  material: Material;
  courseName?: string;
  assignmentNames: string[];
}) {
  const content = (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText style={styles.rowTitle}>{material.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[courseName, material.createdAt].filter(Boolean).join(' · ')}
        </ThemedText>
        {assignmentNames.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            מטלה: {assignmentNames.join(', ')}
          </ThemedText>
        )}
        {material.tags.length > 0 && (
          <View style={styles.tagRow}>
            {material.tags.map((tag) => (
              <ThemedView key={tag} type="backgroundSelected" style={styles.tag}>
                <ThemedText type="small">{tag}</ThemedText>
              </ThemedView>
            ))}
          </View>
        )}
      </View>
    </ThemedView>
  );

  if (!material.courseId) return content;

  return (
    <Link href={`/courses/${material.courseId}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable>
    </Link>
  );
}

export default function MaterialsScreen() {
  const materials = useMaterials();
  const courses = useCourses();
  const assignments = useAssignments();
  const screenPadding = useScreenPadding();

  const [tagFilter, setTagFilter] = useState<'all' | string>('all');
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);
  const assignmentNameById = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.id, assignment.name])),
    [assignments]
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    materials.forEach((material) => material.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [materials]);

  const filterableCourses = useMemo(() => {
    const ids = new Set(materials.map((material) => material.courseId).filter(Boolean));
    return courses.filter((course) => ids.has(course.id));
  }, [materials, courses]);

  const filtered = useMemo(
    () =>
      materials
        .filter((material) => tagFilter === 'all' || material.tags.includes(tagFilter))
        .filter((material) => courseFilter === 'all' || material.courseId === courseFilter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [materials, tagFilter, courseFilter]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.filters, { paddingTop: screenPadding.paddingTop }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label="כל התגיות" selected={tagFilter === 'all'} onPress={() => setTagFilter('all')} />
          {allTags.map((tag) => (
            <FilterChip key={tag} label={tag} selected={tagFilter === tag} onPress={() => setTagFilter(tag)} />
          ))}
        </ScrollView>
        <View style={styles.chipRow}>
          <CourseFilterChip
            courses={filterableCourses}
            selectedCourseId={courseFilter === 'all' ? undefined : courseFilter}
            onChange={(id) => setCourseFilter(id ?? 'all')}
            clearLabel="כל הקורסים"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(material) => material.id}
        renderItem={({ item }) => (
          <MaterialRow
            material={item}
            courseName={courseNameById.get(item.courseId ?? '')}
            assignmentNames={item.assignmentIds.map((id) => assignmentNameById.get(id)).filter(Boolean) as string[]}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: screenPadding.paddingBottom },
        ]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            אין חומרים תואמים
          </ThemedText>
        }
      />

      <CaptureFab />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    gap: Spacing.two,
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
  empty: {
    textAlign: rtlTextAlign.center,
    marginTop: Spacing.four,
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'flex-start',
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
  tagRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
