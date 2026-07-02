import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection } from '@/utils/rtl';

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * A single horizontal bar split into weighted segments, with a legend row of
 * colored dots + counts below. Segments with value 0 are dropped from the bar.
 */
export function SegmentedBar({ segments, height = Spacing.three }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, borderRadius: Radius.pill }]}>
        {total > 0 &&
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <View
                key={segment.label}
                style={{ flexGrow: segment.value, backgroundColor: segment.color }}
              />
            ))}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {segment.label} {segment.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  track: {
    flexDirection: rtlFlexDirection.row,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: rtlFlexDirection.row,
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Radius.pill,
  },
});
