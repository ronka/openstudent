import Constants from 'expo-constants';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { resetAllData } from '@/data/store';
import { getRTLDebugInfo, rtlTextAlign } from '@/utils/rtl';

const UPDATE_VERSION = 1;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
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
          text: 'איפוס נתוני דמו',
          onPress: () => resetAllData(),
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
  }, []);

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
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + Spacing.three }]}>
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
