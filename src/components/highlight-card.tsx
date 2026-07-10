import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export type HighlightTone = 'warning' | 'info' | 'success' | 'destructive' | 'neutral';

/** Tone -> colored surface / foreground text tokens. Mirrors the tone system in `badge.tsx`. */
const TONE_BG: Record<HighlightTone, string> = {
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  destructive: 'bg-destructive',
  neutral: 'bg-muted',
};

const TONE_FG: Record<HighlightTone, string> = {
  warning: 'text-warning-foreground',
  info: 'text-info-foreground',
  success: 'text-success-foreground',
  destructive: 'text-destructive-foreground',
  neutral: 'text-muted-foreground',
};

/** Subtle variant: low-opacity tinted surface + a faint tone border, with the tone color
 * itself as the text color (instead of an on-color foreground). Reads as a gentle accent
 * rather than a solid/alert block. */
const TONE_SOFT_BG: Record<HighlightTone, string> = {
  warning: 'bg-warning/10 border border-warning/25',
  info: 'bg-info/10 border border-info/25',
  success: 'bg-success/10 border border-success/25',
  destructive: 'bg-destructive/10 border border-destructive/25',
  neutral: 'bg-muted border border-border',
};

const TONE_SOFT_FG: Record<HighlightTone, string> = {
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
  destructive: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/**
 * A colored, optionally-linked highlight card. Used for the dashboard hero cards
 * (urgent task / next exam) and the Pomodoro entry point. Color comes from NativeWind
 * tone tokens; geometry/RTL from StyleSheet — matching the app's hybrid styling.
 */
export function HighlightCard({
  tone,
  soft = false,
  emoji,
  label,
  title,
  subtitle,
  trailing,
  href,
  style,
  onPress,
}: {
  tone: HighlightTone;
  soft?: boolean;
  emoji?: string;
  label?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  href?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const bg = soft ? TONE_SOFT_BG[tone] : TONE_BG[tone];
  const fg = soft ? TONE_SOFT_FG[tone] : TONE_FG[tone];

  const body = (
    <>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <View style={styles.main}>
        {label && (
          <Text className={fg} style={[styles.label, styles.dim]} numberOfLines={1}>
            {label}
          </Text>
        )}
        <Text className={fg} style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text className={fg} style={[styles.subtitle, styles.dim]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  // No href: the Box is the flex child directly, so it carries the sizing `style`.
  if (!href) {
    return (
      <Box className={bg} style={[styles.card, style]}>
        {body}
      </Box>
    );
  }

  // With href: the Pressable is the flex child, so sizing (`flex: 1` + any override
  // like fullWidth) must live on it; the inner Box just fills it.
  return (
    <Link href={href as Href} asChild>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, style, pressed && styles.pressed]}>
        <Box className={bg} style={styles.card}>
          {body}
        </Box>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.lg,
    padding: Spacing.three,
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
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: rtlTextAlign.start,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: rtlTextAlign.start,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: rtlTextAlign.start,
  },
  dim: {
    opacity: 0.85,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
