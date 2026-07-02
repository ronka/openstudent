import { DateTimePicker, type DateTimePickerChangeEvent } from '@expo/ui/community/datetime-picker';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

import { Field } from '@/components/form-fields';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NativeChromeColors, Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/** Parse 'YYYY-MM-DD' → local Date (noon, so no timezone day-shift); empty/invalid → today. */
function parseDate(value: string | undefined): Date {
  if (value) {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d, 12);
  }
  return new Date();
}

/** Local Date → 'YYYY-MM-DD' (matches the app's stored date format). */
function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const dateFormatter = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Labeled date field backed by the native OS date picker (`@expo/ui`). Reads/writes
 * `'YYYY-MM-DD'` strings to match the data model. Pass `optional` for a "נקה" (clear)
 * affordance, or omit `label` for a compact inline control (e.g. quick-tasks rows).
 *
 * iOS/web render the picker inline; Android shows a pressable that opens the native
 * dialog. When empty, all platforms show a "בחרו תאריך" placeholder.
 */
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  style,
}: {
  label?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [open, setOpen] = useState(false);
  const hasValue = !!value;
  const selected = parseDate(value);

  function commit(_event: DateTimePickerChangeEvent, date: Date) {
    onChange(formatValue(date));
    setOpen(false);
  }

  const picker = (
    <DateTimePicker
      value={selected}
      onValueChange={commit}
      onDismiss={() => setOpen(false)}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      accentColor={NativeChromeColors[scheme].text}
      themeVariant={scheme}
    />
  );

  const pressableRow = (text: string, secondary: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.display}>
        <ThemedText themeColor={secondary ? 'textSecondary' : 'text'} style={styles.displayText}>
          {text}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );

  let control: ReactNode;
  if (!hasValue) {
    // Empty: tap the placeholder to open the picker (Android) or seed today's date (iOS/web inline).
    control = (
      <>
        {pressableRow('בחרו תאריך', true, () =>
          Platform.OS === 'android' ? setOpen(true) : onChange(formatValue(new Date()))
        )}
        {Platform.OS === 'android' && open ? picker : null}
      </>
    );
  } else if (Platform.OS === 'android') {
    control = (
      <>
        {pressableRow(dateFormatter.format(selected), false, () => setOpen(true))}
        {open ? picker : null}
      </>
    );
  } else {
    control = picker;
  }

  const body = (
    <View style={[styles.row, !label && style]}>
      <View style={styles.control}>{control}</View>
      {optional && hasValue ? (
        <ThemedText type="link" themeColor="textSecondary" onPress={() => onChange('')}>
          נקה
        </ThemedText>
      ) : null}
    </View>
  );

  return label ? <Field label={label}>{body}</Field> : body;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    gap: Spacing.three,
  },
  control: {
    flex: 1,
  },
  display: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  displayText: {
    textAlign: rtlTextAlign.start,
  },
  pressed: {
    opacity: 0.7,
  },
});
