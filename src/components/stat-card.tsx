import { Platform, StyleSheet } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { rtlTextAlign } from '@/utils/rtl';

/**
 * Compact KPI tile: a big accent value, a label, an optional caption, and an optional
 * inline progress bar. Sized to grow to ~half the row so two sit side by side.
 */
export function StatCard({
  value,
  label,
  caption,
  progress,
}: {
  value: string;
  label: string;
  caption?: string;
  progress?: number;
}) {
  return (
    <ThemedView type="card" className="border-border" style={styles.card}>
      <ThemedText type="subtitle" themeColor="accent" style={styles.value}>
        {value}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      {caption && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {caption}
        </ThemedText>
      )}
      {progress !== undefined && <ProgressBar value={progress} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  value: {
    textAlign: rtlTextAlign.start,
  },
  label: {
    textAlign: rtlTextAlign.start,
  },
});
