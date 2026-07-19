import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Slide-up bottom sheet used by the create/edit forms. Tapping the dimmed
 * backdrop or the "סגור" action closes it. Children supply the body (and any
 * footer buttons); wrap long bodies in a ScrollView.
 */
export function FormSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="link" themeColor="textSecondary" onPress={onClose}>
              סגור
            </ThemedText>
          </View>
          {children}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Full-width sheet action button. `variant="ghost"` for secondary actions like דלג,
 * `variant="destructive"` for dangerous actions like deletion. */
export function SheetButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'destructive';
}) {
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive' && !disabled;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isGhost || disabled ? 'backgroundElement' : 'text'}
        className={isDestructive ? 'bg-destructive' : undefined}
        style={styles.button}>
        <ThemedText
          type="smallBold"
          themeColor={isGhost || disabled ? 'textSecondary' : 'background'}
          className={isDestructive ? 'text-destructive-foreground' : undefined}
          style={styles.buttonText}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    textAlign: rtlTextAlign.center,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    maxHeight: '90%',
  },
  header: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: rtlTextAlign.start,
  },
});
