import { Link, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { SelectModal } from '@/components/select-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { FACULTIES } from '@/data/faculties.generated';
import { setFaculty, setName, useFaculty, useName } from '@/data/profile';
import { recognizedCreditsTotal, useRecognizedCredits } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export default function ProfileScreen() {
  const screenPadding = useScreenPadding();
  const name = useName();
  const faculty = useFaculty();
  const recognizedCredits = useRecognizedCredits();
  const recognizedTotal = recognizedCreditsTotal(recognizedCredits);

  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [facultyModalOpen, setFacultyModalOpen] = useState(false);

  const openNameSheet = useCallback(() => {
    // Seed from the stored value on every open so a cancelled edit doesn't linger.
    setNameDraft(name);
    setNameSheetOpen(true);
  }, [name]);

  const saveName = useCallback(() => {
    setName(nameDraft);
    setNameSheetOpen(false);
  }, [nameDraft]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <View style={styles.hero}>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText style={styles.badgeEmoji}>👤</ThemedText>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.appName}>
            {name || 'הפרופיל שלי'}
          </ThemedText>
        </View>

        <Pressable onPress={openNameSheet}>
          {({ pressed }) => (
            <ThemedView
              type="card"
              className="border-border"
              style={[styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  שם
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
                  {name || 'לא הוגדר'}
                </ThemedText>
              </View>
            </ThemedView>
          )}
        </Pressable>

        <Pressable onPress={() => setFacultyModalOpen(true)}>
          {({ pressed }) => (
            <ThemedView
              type="card"
              className="border-border"
              style={[styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  פקולטה
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
                  {faculty || 'בחר פקולטה'}
                </ThemedText>
              </View>
            </ThemedView>
          )}
        </Pressable>

        <Link href={'/more/recognized-credits' as Href} asChild>
          <Pressable>
            {({ pressed }) => (
              <ThemedView
                type="card"
                className="border-border"
                style={[styles.row, pressed && styles.pressed]}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" style={styles.rowTitle}>
                    נק״ז מוכרות
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
                    {recognizedTotal > 0
                      ? `${recognizedTotal} נק״ז · לימודים קודמים, פעילות ומילואים`
                      : 'לימודים קודמים, פעילות ומילואים'}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">‹</ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </Link>
      </ScrollView>

      <FormSheet visible={nameSheetOpen} onClose={() => setNameSheetOpen(false)} title="שם">
        <View style={styles.sheetBody}>
          <TextField
            label="שם"
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="השם שלך"
          />
          <SheetButton label="שמירה" onPress={saveName} />
        </View>
      </FormSheet>

      <SelectModal<string>
        visible={facultyModalOpen}
        onClose={() => setFacultyModalOpen(false)}
        items={FACULTIES}
        getKey={(f) => f}
        getLabel={(f) => f}
        matches={(f, q) => f.includes(q)}
        title="פקולטה"
        searchPlaceholder="חיפוש פקולטה"
        emptyLabel="לא נמצאו פקולטות"
        selectedKey={faculty || undefined}
        onSelect={setFaculty}
        clearLabel="ללא פקולטה"
        onClear={() => setFaculty('')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  appName: {
    textAlign: 'center',
  },
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
  sheetBody: {
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
