import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { rtlTextAlign } from '@/utils/rtl';

export function Section({
  title,
  emptyLabel,
  isEmpty,
  children,
}: {
  title: string;
  emptyLabel: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {isEmpty ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.title}>
          {emptyLabel}
        </ThemedText>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  title: {
    textAlign: rtlTextAlign.start,
  },
  body: {
    gap: Spacing.two,
  },
});
