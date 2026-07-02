import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection } from '@/utils/rtl';

/**
 * Horizontal progress bar. `value` is clamped to 0..1. The fill originates from the
 * start edge (right in RTL) by laying the track out as an RTL-aware flex row.
 */
export function ProgressBar({
  value,
  height = Spacing.two,
  showLabel = false,
}: {
  value: number;
  height?: number;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.container}>
      <ThemedView type="accentSoft" style={[styles.track, { height, borderRadius: Radius.pill }]}>
        <ThemedView type="accent" style={{ width: `${pct * 100}%`, borderRadius: Radius.pill }} />
      </ThemedView>
      {showLabel && (
        <ThemedText type="smallBold" themeColor="accent">
          {Math.round(pct * 100)}%
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    flex: 1,
    flexDirection: rtlFlexDirection.row,
    overflow: 'hidden',
  },
});
