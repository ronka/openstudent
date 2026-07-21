import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/**
 * Current keyboard height on iOS, 0 when hidden. Android is left at 0 — it
 * relies on the native window resize (softwareKeyboardLayoutMode) instead, so
 * adding our own lift there would double up.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

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
  const keyboardHeight = useKeyboardHeight();

  // Lift the sheet above the keyboard on iOS. KeyboardAvoidingView is unreliable
  // inside a transparent Modal, so we track the height ourselves and shift the
  // sheet up via marginBottom (which doesn't grow it into the maxHeight cap).
  // While the keyboard is up it already covers the home-indicator inset, so drop it.
  const raised = keyboardHeight > 0;
  const { height: windowHeight } = useWindowDimensions();
  // The cap has to come off the space that's actually left above the keyboard: a
  // percentage maxHeight measures the full screen, so a tall sheet lifted by
  // `marginBottom` would run off the top edge and clip its own header.
  const maxHeight = (windowHeight - keyboardHeight) * 0.9;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ThemedView
          style={[
            styles.sheet,
            {
              maxHeight,
              marginBottom: keyboardHeight,
              paddingBottom: raised ? Spacing.four : insets.bottom + Spacing.four,
            },
          ]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="link" themeColor="textSecondary" onPress={onClose}>
              סגור
            </ThemedText>
          </View>
          {children}
        </ThemedView>
      </View>
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
  size = 'md',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'destructive';
  /** `sm` is for inline page actions (e.g. the course header), where a full-height
   * sheet button would dominate the screen. `md` stays the default for sheets. */
  size?: 'md' | 'sm';
}) {
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive' && !disabled;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isGhost || disabled ? 'backgroundElement' : 'text'}
        className={isDestructive ? 'bg-destructive' : undefined}
        style={[styles.button, size === 'sm' && styles.buttonSm]}>
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
  buttonSm: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
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
