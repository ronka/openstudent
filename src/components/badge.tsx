import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

const TONE_COLORS: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: '#E0E1E6', text: '#3C3C43' },
  info: { background: '#DCEBFF', text: '#1D4ED8' },
  success: { background: '#DCFCE7', text: '#15803D' },
  warning: { background: '#FEF3C7', text: '#B45309' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const colors = TONE_COLORS[tone];

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText type="smallBold" style={[styles.text, { color: colors.text }]}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
