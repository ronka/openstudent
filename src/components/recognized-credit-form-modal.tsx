import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ChipField, TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  DEGREE_CREDITS_TARGET,
  RECOGNIZED_CREDIT_TYPE_LABELS,
  RECOGNIZED_CREDIT_TYPES,
} from '@/data/constants';
import { recognizedCreditsCollection } from '@/data/store';
import type { RecognizedCredit, RecognizedCreditType } from '@/data/types';
import { posthog } from '@/utils/analytics';
import { rtlTextAlign } from '@/utils/rtl';

export function RecognizedCreditFormModal({
  visible,
  onClose,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  item?: RecognizedCredit;
}) {
  const [type, setType] = useState<RecognizedCreditType>('prior_studies');
  const [credits, setCredits] = useState('');
  const [year, setYear] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset the mounted sheet on every open */
    setType(item?.type ?? 'prior_studies');
    setCredits(item ? String(item.credits) : '');
    setYear(item?.year !== undefined ? String(item.year) : '');
    setNote(item?.note ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [visible, item]);

  function selectType(nextType: RecognizedCreditType) {
    setType(nextType);
    if (!credits && (nextType === 'social_activity' || nextType === 'reserve_service')) setCredits('2');
  }

  function handleSave() {
    const parsedCredits = Number(credits.trim().replace(',', '.'));
    const parsedYear = year.trim() ? Number(year.trim()) : undefined;
    if (!Number.isFinite(parsedCredits) || parsedCredits <= 0 || parsedCredits > DEGREE_CREDITS_TARGET) {
      Alert.alert('שגיאה', `יש להזין מספר נק״ז בין 0 ל־${DEGREE_CREDITS_TARGET}`);
      return;
    }
    if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2200)) {
      Alert.alert('שגיאה', 'יש להזין שנה תקינה');
      return;
    }

    const values = {
      type,
      credits: parsedCredits,
      year: parsedYear,
      note: note.trim() || undefined,
    };
    if (item) recognizedCreditsCollection.update(item.id, values);
    else recognizedCreditsCollection.add({ id: `recognized-credit-${Date.now()}`, ...values });
    posthog.capture(item ? 'recognized_credit_updated' : 'recognized_credit_created', {
      recognized_credit_type: type,
      credits: parsedCredits,
    });
    onClose();
  }

  function handleDelete() {
    if (!item) return;
    Alert.alert('מחיקת נק״ז מוכרות', `למחוק את "${RECOGNIZED_CREDIT_TYPE_LABELS[item.type]}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => {
          recognizedCreditsCollection.remove(item.id);
          posthog.capture('recognized_credit_deleted', { recognized_credit_type: item.type });
          onClose();
        },
      },
    ]);
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title={item ? 'עריכת נק״ז מוכרות' : 'הוספת נק״ז מוכרות'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <ChipField
          label="סוג ההכרה"
          options={RECOGNIZED_CREDIT_TYPES}
          getLabel={(option) => RECOGNIZED_CREDIT_TYPE_LABELS[option]}
          isSelected={(option) => option === type}
          onSelect={selectType}
        />
        <TextField
          label="מספר נק״ז"
          value={credits}
          onChangeText={setCredits}
          placeholder="2"
          keyboardType="decimal-pad"
        />
        <TextField
          label="שנה (אופציונלי)"
          value={year}
          onChangeText={setYear}
          placeholder="2026"
          keyboardType="number-pad"
        />
        <TextField label="הערה (אופציונלי)" value={note} onChangeText={setNote} placeholder="למשל: החלטת הוועדה" />
        <View style={styles.info}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
            הנק״ז יתווספו להתקדמות בתואר, אך לא ישפיעו על ממוצע הציונים.
          </ThemedText>
        </View>
        <SheetButton label="שמירה" onPress={handleSave} />
        {item ? <SheetButton label="מחיקה" variant="destructive" onPress={handleDelete} /> : null}
      </ScrollView>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  info: {
    padding: Spacing.three,
  },
  infoText: {
    textAlign: rtlTextAlign.start,
  },
});
