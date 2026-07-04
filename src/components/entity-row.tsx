import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlMargin, rtlTextAlign } from '@/utils/rtl';

export function EntityRow({
  title,
  subtitle,
  leading,
  trailing,
  href,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const content = (
    <ThemedView type="backgroundElement" style={styles.row}>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.main}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle && (
          <ThemedText style={styles.subtitle} type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {trailing}
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
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  leading: {
    ...rtlMargin.marginEnd(Spacing.three),
  },
  main: {
    flex: 1,
    gap: Spacing.half,
    ...rtlMargin.marginEnd(Spacing.three),
  },
  title: {
    textAlign: rtlTextAlign.start,
  },
  subtitle: {
    textAlign: rtlTextAlign.start,
  },
  pressed: {
    opacity: 0.7,
  },
});
