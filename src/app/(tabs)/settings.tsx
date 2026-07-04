import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { resetOnboarding } from '@/data/onboarding';
import { resetAllData } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { getRTLDebugInfo, rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const UPDATE_VERSION = 1;

export default function SettingsScreen() {
  const screenPadding = useScreenPadding();
  const router = useRouter();
  const appVersion = `${Constants.expoConfig?.version ?? '1.0.0'}-${UPDATE_VERSION}`;

  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
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
            resetOnboarding();
            router.replace('/onboarding');
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
  pressed: {
    opacity: 0.7,
  },
  footer: {
    textAlign: 'center',
  },
});
