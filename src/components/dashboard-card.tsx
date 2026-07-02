import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Surface wrapper for every dashboard section: a bordered card with an optional title
 * row and optional trailing action. When `href` is set the whole card becomes a link,
 * mirroring the pattern in `entity-row.tsx`.
 */
export function DashboardCard({
  title,
  action,
  href,
  children,
}: {
  title?: string;
  action?: ReactNode;
  href?: string;
  children: ReactNode;
}) {
  const content = (
    <ThemedView type="card" className="border-border" style={styles.card}>
      {title && (
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          {action}
        </View>
      )}
      {children}
    </ThemedView>
  );

  if (!href) return content;

  return (
    <Link href={href as Href} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
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
  header: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    textAlign: rtlTextAlign.start,
  },
  pressed: {
    opacity: 0.7,
  },
});
