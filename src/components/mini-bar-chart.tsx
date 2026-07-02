import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { rtlFlexDirection } from '@/utils/rtl';

export interface BarPoint {
  /** Raw value, e.g. an exam grade. */
  value: number;
  /** Stable key for React. */
  key: string;
}

/**
 * A row of vertical bars — a dependency-free sparkline. Each bar's height is scaled
 * against `max` (default 100, i.e. a grade scale). Bars keep a small minimum height so
 * low values stay visible. Laid out RTL so the earliest point sits on the right.
 */
export function MiniBarChart({
  data,
  max = 100,
  height = 96,
}: {
  data: BarPoint[];
  max?: number;
  height?: number;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { height }]}>
      {data.map((point) => {
        const ratio = max > 0 ? Math.max(0, Math.min(1, point.value / max)) : 0;
        return (
          <View
            key={point.key}
            style={[
              styles.bar,
              {
                height: `${Math.max(ratio * 100, 6)}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  bar: {
    flex: 1,
    minWidth: Spacing.one,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
});
