import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EntityRow } from '@/components/entity-row';
import { RecognizedCreditFormModal } from '@/components/recognized-credit-form-modal';
import { SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { RECOGNIZED_CREDIT_TYPE_LABELS } from '@/data/constants';
import { recognizedCreditsTotal, useRecognizedCredits } from '@/data/store';
import type { RecognizedCredit } from '@/data/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlTextAlign } from '@/utils/rtl';

export default function RecognizedCreditsScreen() {
  const screenPadding = useScreenPadding();
  const credits = useRecognizedCredits();
  const total = useMemo(() => recognizedCreditsTotal(credits), [credits]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecognizedCredit | undefined>();

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(item: RecognizedCredit) {
    setEditing(item);
    setFormOpen(true);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.text}>
            נק״ז מוכרות
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            הכרה בלימודים קודמים, פעילות חברתית, שירות מילואים או הכרה אחרת.
          </ThemedText>
        </View>

        <ThemedView type="card" className="border-border" style={styles.summary}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            סך הכול
          </ThemedText>
          <ThemedText type="subtitle" style={styles.text}>
            {total} נק״ז
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            נספרות בהתקדמות בתואר · לא נכללות בממוצע
          </ThemedText>
        </ThemedView>

        <View style={styles.list}>
          {credits.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              עדיין לא הוספו נק״ז מוכרות
            </ThemedText>
          ) : (
            credits.map((item) => (
              <Pressable key={item.id} onPress={() => openEdit(item)}>
                {({ pressed }) => (
                  <View style={pressed && styles.pressed}>
                    <EntityRow
                      title={RECOGNIZED_CREDIT_TYPE_LABELS[item.type]}
                      subtitle={[item.year, item.note].filter(Boolean).join(' · ') || undefined}
                      trailing={<ThemedText type="smallBold">{item.credits} נק״ז ›</ThemedText>}
                    />
                  </View>
                )}
              </Pressable>
            ))
          )}
        </View>

        <SheetButton label="הוספת נק״ז מוכרות" onPress={openNew} />
      </ScrollView>

      <RecognizedCreditFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  header: { gap: Spacing.two, paddingTop: Spacing.four },
  text: { textAlign: rtlTextAlign.start },
  summary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  list: { gap: Spacing.two },
  empty: { textAlign: rtlTextAlign.center, paddingVertical: Spacing.four },
  pressed: { opacity: 0.7 },
});
