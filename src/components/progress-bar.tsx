import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.accentSoft, height, borderRadius: Radius.pill },
        ]}>
        <View
          style={{
            width: `${pct * 100}%`,
            backgroundColor: theme.accent,
            borderRadius: Radius.pill,
          }}
        />
      </View>
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
