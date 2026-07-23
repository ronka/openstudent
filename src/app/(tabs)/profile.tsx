import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { SelectModal } from '@/components/select-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { FACULTIES } from '@/data/faculties.generated';
import {
  setExemptCredits,
  setFaculty,
  setName,
  useExemptCredits,
  useFaculty,
  useName,
} from '@/data/profile';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export default function ProfileScreen() {
  const screenPadding = useScreenPadding();
  const name = useName();
  const faculty = useFaculty();
  const exemptCredits = useExemptCredits();

  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [facultyModalOpen, setFacultyModalOpen] = useState(false);

  const [exemptSheetOpen, setExemptSheetOpen] = useState(false);
  const [exemptDraft, setExemptDraft] = useState('');

  const openNameSheet = useCallback(() => {
    // Seed from the stored value on every open so a cancelled edit doesn't linger.
    setNameDraft(name);
    setNameSheetOpen(true);
  }, [name]);

  const saveName = useCallback(() => {
    setName(nameDraft);
    setNameSheetOpen(false);
  }, [nameDraft]);

  const openExemptSheet = useCallback(() => {
    setExemptDraft(exemptCredits > 0 ? String(exemptCredits) : '');
    setExemptSheetOpen(true);
  }, [exemptCredits]);

  const saveExemptCredits = useCallback(() => {
    // An empty field means "none" — Number('') is 0, which clears the key.
    setExemptCredits(Number(exemptDraft.trim().replace(',', '.')));
    setExemptSheetOpen(false);
  }, [exemptDraft]);

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

        <Pressable onPress={openExemptSheet}>
          {({ pressed }) => (
            <ThemedView
              type="card"
              className="border-border"
              style={[styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  הכרה בלימודים קודמים
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
                  {exemptCredits > 0 ? `${exemptCredits} נק״ז פטור` : 'אין נק״ז פטור'}
                </ThemedText>
              </View>
            </ThemedView>
          )}
        </Pressable>
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

      <FormSheet
        visible={exemptSheetOpen}
        onClose={() => setExemptSheetOpen(false)}
        title="הכרה בלימודים קודמים">
        <View style={styles.sheetBody}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
            נק״ז שקיבלת בהכרה מלימודים קודמים (הנדסאי, מכללה או מוסד אחר). הם ייספרו בהתקדמות בתואר.
          </ThemedText>
          <TextField
            label="נק״ז פטור"
            value={exemptDraft}
            onChangeText={setExemptDraft}
            placeholder="0"
            keyboardType="numeric"
          />
          <SheetButton label="שמירה" onPress={saveExemptCredits} />
        </View>
      </FormSheet>
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
