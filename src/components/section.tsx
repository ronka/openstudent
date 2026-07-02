import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

export function Section({
  title,
  emptyLabel,
  isEmpty,
  action,
  children,
}: {
  title: string;
  emptyLabel: string;
  isEmpty: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        {action}
      </View>
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
  header: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    textAlign: rtlTextAlign.start,
  },
  body: {
    gap: Spacing.two,
  },
});
