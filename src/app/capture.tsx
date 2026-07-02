import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { ThemedTextInput } from '@/components/form-fields';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { materialsCollection, useCourses, useMaterials } from '@/data/store';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Quick capture for study materials. Tasks (מטלות) are created through the typed
 * forms on the מטלות / קורסים tabs, so this screen only handles unfiled materials.
 */
export default function CaptureScreen() {
  const materials = useMaterials();
  const courses = useCourses();

  const [name, setName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inboxMaterials = useMemo(
    () => materials.filter((material) => !material.courseId),
    [materials]
  );

  function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    materialsCollection.add({
      id: `m-inbox-${Date.now()}`,
      name: trimmedName,
      courseId: selectedCourseId,
      assignmentIds: [],
      tags: [],
      createdAt: new Date().toISOString().slice(0, 10),
    });

    setName('');
    setSelectedCourseId(undefined);
  }

  function fileToCourse(materialId: string, courseId: string) {
    materialsCollection.update(materialId, { courseId });
    setExpandedId(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <ThemedTextInput value={name} onChangeText={setName} placeholder="שם החומר" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="ללא שיוך"
            selected={selectedCourseId === undefined}
            onPress={() => setSelectedCourseId(undefined)}
          />
          {courses.map((course) => (
            <FilterChip
              key={course.id}
              label={course.name}
              selected={selectedCourseId === course.id}
              onPress={() => setSelectedCourseId(course.id)}
            />
          ))}
        </ScrollView>

        <ThemedView type={name.trim() ? 'text' : 'backgroundElement'} style={styles.addButton}>
          <ThemedText
            themeColor={name.trim() ? 'background' : 'textSecondary'}
            style={styles.addButtonText}
            onPress={handleAdd}>
            {selectedCourseId ? 'הוסף לקורס' : 'הוסף לתיבת הקליטה'}
          </ThemedText>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          תיבת קליטה
        </ThemedText>

        {inboxMaterials.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
            אין פריטים לא משויכים
          </ThemedText>
        ) : (
          inboxMaterials.map((material) => {
            const isExpanded = expandedId === material.id;
            return (
              <ThemedView key={material.id} type="backgroundElement" style={styles.inboxRow}>
                <View style={styles.inboxRowMain}>
                  <ThemedText style={styles.rowTitle}>{material.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    חומר
                  </ThemedText>
                </View>
                <ThemedText
                  type="linkPrimary"
                  onPress={() => setExpandedId(isExpanded ? null : material.id)}>
                  שייך לקורס
                </ThemedText>

                {isExpanded && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.coursePicker}
                    contentContainerStyle={styles.chipRow}>
                    {courses.map((course) => (
                      <FilterChip
                        key={course.id}
                        label={course.name}
                        selected={false}
                        onPress={() => fileToCourse(material.id, course.id)}
                      />
                    ))}
                  </ScrollView>
                )}
              </ThemedView>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textAlign: rtlTextAlign.start,
  },
  chipRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
  },
  addButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  addButtonText: {
    textAlign: rtlTextAlign.center,
  },
  inboxRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  inboxRowMain: {
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
  coursePicker: {
    marginTop: Spacing.one,
  },
});
