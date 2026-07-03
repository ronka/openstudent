import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { resetOnboarding } from '@/data/onboarding';
import { resetAllData } from '@/data/store';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { getRTLDebugInfo, rtlTextAlign } from '@/utils/rtl';

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
    <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
      <Pressable onPress={handleAppDetailsPress}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedText style={styles.rowTitle}>פרטי האפליקציה</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.rowTitle}>
            גרסה {appVersion}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
  },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  rowTitle: {
    textAlign: rtlTextAlign.start,
  },
});
