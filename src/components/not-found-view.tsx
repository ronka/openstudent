import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { rtlTextAlign } from '@/utils/rtl';

/** Full-screen "not found" state for a detail route with an invalid/missing id. */
export function NotFoundView({ title, message }: { title: string; message: string }) {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <ThemedText style={styles.message}>{message}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: rtlTextAlign.center,
    margin: Spacing.four,
  },
});
