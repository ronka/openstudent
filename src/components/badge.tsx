import { StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

/** Tone -> gluestack background token. Shared with other tone-driven visuals (e.g. the
 * dashboard's assignment-status bar) so every "status color" in the app stays in sync. */
export const TONE_BACKGROUND_CLASSNAMES: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
};

const TONE_TEXT_CLASSNAMES: Record<BadgeTone, string> = {
  neutral: 'text-muted-foreground',
  info: 'text-info-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <Box className={TONE_BACKGROUND_CLASSNAMES[tone]} style={styles.container}>
      <Text className={TONE_TEXT_CLASSNAMES[tone]} style={styles.text}>
        {label}
      </Text>
    </Box>
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
    fontWeight: '700',
  },
});
