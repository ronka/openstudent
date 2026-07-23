import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { TextField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { disableNotifications, rescheduleAll } from '@/data/notification-scheduler';
import { enableNotifications, useNotificationsEnabled } from '@/data/notification-settings';
import { resetOnboarding } from '@/data/onboarding';
import { setExemptCredits, useExemptCredits } from '@/data/profile';
import { resetAllData } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { getRTLDebugInfo, rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const UPDATE_VERSION = 10;

export default function SettingsScreen() {
  const screenPadding = useScreenPadding();
  const router = useRouter();
  const notificationsEnabled = useNotificationsEnabled();
  const exemptCredits = useExemptCredits();
  const appVersion = `${Constants.expoConfig?.version ?? '1.0.0'}-${UPDATE_VERSION}`;

  const [exemptSheetOpen, setExemptSheetOpen] = useState(false);
  const [exemptDraft, setExemptDraft] = useState('');

  const openExemptSheet = useCallback(() => {
    // Seed from the stored value on every open so a cancelled edit doesn't linger.
    setExemptDraft(exemptCredits > 0 ? String(exemptCredits) : '');
    setExemptSheetOpen(true);
  }, [exemptCredits]);

  const saveExemptCredits = useCallback(() => {
    // An empty field means "none" — Number('') is 0, which clears the key.
    setExemptCredits(Number(exemptDraft.trim().replace(',', '.')));
    setExemptSheetOpen(false);
  }, [exemptDraft]);

  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    if (value) {
      const status = await enableNotifications();
      // A permanent denial resolves without a system dialog — steer the user to OS settings.
      if (status !== 'granted') {
        Alert.alert(
          'התראות חסומות',
          'כדי לקבל תזכורות יש לאפשר התראות עבור Open Student בהגדרות המכשיר.',
          [
            { text: 'ביטול', style: 'cancel' },
            { text: 'פתח הגדרות', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      await disableNotifications();
    }
  }, []);

  const showDebugOptions = useCallback(() => {
    Alert.alert(
      'תפריט דיבאג',
      'בחר פעולה',
      [
        {
          text: 'איפוס נתונים ואונבורדינג',
          onPress: () => {
            resetAllData();
            setExemptCredits(0);
            resetOnboarding();
            router.replace('/onboarding');
          },
        },
        {
          text: 'התראות מתוזמנות',
          onPress: async () => {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const preview = scheduled
              .slice(0, 5)
              .map((entry) => `${entry.content.title} — ${JSON.stringify(entry.trigger)}`)
              .join('\n\n');
            Alert.alert(`${scheduled.length} התראות מתוזמנות`, preview || 'אין התראות מתוזמנות');
          },
        },
        {
          text: 'תזמן התראות מחדש',
          onPress: () => {
            void rescheduleAll();
          },
        },
        {
          text: 'מידע RTL',
          onPress: () => {
            const info = getRTLDebugInfo();
            Alert.alert('מידע RTL', JSON.stringify(info, null, 2));
          },
        },
        { text: 'ביטול', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [router]);

  const handleAppDetailsPress = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      showDebugOptions();
      return;
    }
    tapTimeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 500);
  }, [showDebugOptions]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <View style={styles.hero}>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText style={styles.badgeEmoji}>🎓</ThemedText>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.appName}>
            Open Student
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
            כל הלימודים שלך במקום אחד
          </ThemedText>
        </View>

        <ThemedView type="card" className="border-border" style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold" style={styles.rowTitle}>
              התראות
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
              תזכורת שבוע לפני ויום לפני כל הגשה ובחינה
            </ThemedText>
          </View>
          <Switch value={notificationsEnabled} onValueChange={handleToggleNotifications} />
        </ThemedView>

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

        <Pressable onPress={handleAppDetailsPress}>
          {({ pressed }) => (
            <ThemedView
              type="card"
              className="border-border"
              style={[styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  פרטי האפליקציה
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
                  גרסה {appVersion}
                </ThemedText>
              </View>
            </ThemedView>
          )}
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          נבנה באהבה לסטודנטים 💙
        </ThemedText>
      </ScrollView>

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
  tagline: {
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
  footer: {
    textAlign: 'center',
  },
});
