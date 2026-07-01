import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { assignmentsCollection, materialsCollection, useAssignments, useCourses, useMaterials } from '@/data/store';
import type { Assignment, Material } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

type CaptureKind = 'assignment' | 'material';

type InboxItem =
  | { kind: 'assignment'; item: Assignment }
  | { kind: 'material'; item: Material };

export default function CaptureScreen() {
  const theme = useTheme();
  const assignments = useAssignments();
  const materials = useMaterials();
  const courses = useCourses();

  const [kind, setKind] = useState<CaptureKind>('assignment');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const unfiledAssignments = assignments
      .filter((assignment) => !assignment.courseId)
      .map((item): InboxItem => ({ kind: 'assignment', item }));
    const unfiledMaterials = materials
      .filter((material) => !material.courseId)
      .map((item): InboxItem => ({ kind: 'material', item }));
    return [...unfiledAssignments, ...unfiledMaterials];
  }, [assignments, materials]);

  function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (kind === 'assignment') {
      assignmentsCollection.add({
        id: `a-inbox-${Date.now()}`,
        name: trimmedName,
        status: 'todo',
        dueDate: dueDate.trim() || undefined,
        materialIds: [],
      });
    } else {
      materialsCollection.add({
        id: `m-inbox-${Date.now()}`,
        name: trimmedName,
        assignmentIds: [],
        tags: [],
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }

    setName('');
    setDueDate('');
  }

  function fileToCourse(inboxItem: InboxItem, courseId: string) {
    if (inboxItem.kind === 'assignment') {
      assignmentsCollection.update(inboxItem.item.id, { courseId });
    } else {
      materialsCollection.update(inboxItem.item.id, { courseId });
    }
    setExpandedId(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.chipRow}>
          <FilterChip label="משימה" selected={kind === 'assignment'} onPress={() => setKind('assignment')} />
          <FilterChip label="חומר" selected={kind === 'material'} onPress={() => setKind('material')} />
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'assignment' ? 'שם המשימה' : 'שם החומר'}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {kind === 'assignment' && (
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="תאריך הגשה (אופציונלי, YYYY-MM-DD)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        )}

        <ThemedView type={name.trim() ? 'text' : 'backgroundElement'} style={styles.addButton}>
          <ThemedText
            themeColor={name.trim() ? 'background' : 'textSecondary'}
            style={styles.addButtonText}
            onPress={handleAdd}>
            הוסף לתיבת הקליטה
          </ThemedText>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          תיבת קליטה
        </ThemedText>

        {inboxItems.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
            אין פריטים לא משויכים
          </ThemedText>
        ) : (
          inboxItems.map((inboxItem) => {
            const isExpanded = expandedId === inboxItem.item.id;
            return (
              <ThemedView key={inboxItem.item.id} type="backgroundElement" style={styles.inboxRow}>
                <View style={styles.inboxRowMain}>
                  <ThemedText style={styles.rowTitle}>{inboxItem.item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {inboxItem.kind === 'assignment' ? 'משימה' : 'חומר'}
                  </ThemedText>
                </View>
                <ThemedText
                  type="linkPrimary"
                  onPress={() => setExpandedId(isExpanded ? null : inboxItem.item.id)}>
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
                        onPress={() => fileToCourse(inboxItem, course.id)}
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
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlign: rtlTextAlign.start,
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
