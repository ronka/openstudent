import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

/** Presentational centered "+" floating button. */
export function Fab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { bottom: insets.bottom + BottomTabInset + Spacing.three }]}>
      <ThemedView type="text" style={styles.fab}>
        <ThemedText themeColor="background" style={styles.plus}>
          +
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -28 }],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 28,
    lineHeight: 32,
  },
});
