import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ChipField, TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { CatalogSelectField } from '@/components/study-group-course-filter';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SEMESTERS } from '@/data/constants';
import { getCurrentSemester, getYearOptions } from '@/data/semester';
import { PLATFORM_EMOJI, PLATFORM_LABELS, detectPlatform } from '@/data/study-groups';
import type { Semester } from '@/data/types';
import { rtlTextAlign } from '@/utils/rtl';

const YEAR_OPTIONS = getYearOptions();

/**
 * Easy submission form for a study-group link. MVP: validates the URL (must be a
 * recognized WhatsApp/Telegram invite) and `console.log`s the payload — no persistence.
 */
export function SubmitGroupLinkForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const current = useMemo(() => getCurrentSemester(), []);

  const [courseNumber, setCourseNumber] = useState('');
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCourseNumber('');
    setYear(current.year);
    setSemester(current.term);
    setUrl('');
    // Only reset when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const detected = detectPlatform(url);
  const hint = url.trim()
    ? detected
      ? `${PLATFORM_EMOJI[detected]} ${PLATFORM_LABELS[detected]}`
      : 'קישור לא מזוהה — יש להזין קישור וואטסאפ או טלגרם'
    : undefined;

  function handleSubmit() {
    if (!courseNumber) {
      Alert.alert('שגיאה', 'אנא בחרו קורס');
      return;
    }
    const platform = detectPlatform(url);
    if (!platform) {
      Alert.alert('שגיאה', 'קישור לא תקין — יש להזין קישור וואטסאפ או טלגרם');
      return;
    }

    const payload = { courseNumber, year, semester, platform, url: url.trim() };
    console.log('submit group link', payload);

    Alert.alert('נשלח', 'הקישור נשלח לבדיקה');
    onClose();
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="הוספת קבוצה">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <CatalogSelectField label="קורס" selectedCourseNumber={courseNumber || undefined} onSelect={setCourseNumber} />
        <ChipField
          label="סמסטר"
          options={SEMESTERS}
          getLabel={(option) => option}
          isSelected={(option) => semester === option}
          onSelect={setSemester}
        />
        <ChipField
          label="שנה"
          scroll
          options={YEAR_OPTIONS}
          getLabel={String}
          isSelected={(option) => year === option}
          onSelect={setYear}
        />
        <TextField
          label="קישור לקבוצה"
          value={url}
          onChangeText={setUrl}
          placeholder="https://chat.whatsapp.com/..."
          keyboardType="url"
        />
        {hint && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {hint}
          </ThemedText>
        )}

        <SheetButton label="שליחה" onPress={handleSubmit} />
      </ScrollView>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: rtlTextAlign.start,
  },
});
