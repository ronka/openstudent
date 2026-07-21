import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { Input, InputField } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/** A labeled form row. Building block for ChipField / TextField and custom fields. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * Single-select row of chips over `options`. Selection lives in the caller
 * (`isSelected` / `onSelect`), so it handles required picks and optional
 * toggle-to-clear alike. Pass `scroll` for long lists (numbers, courses).
 */
export function ChipField<T>({
  label,
  options,
  isSelected,
  onSelect,
  getLabel,
  getKey = (option) => String(option),
  scroll = false,
  reverse = false,
}: {
  label: string;
  options: readonly T[];
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  getLabel: (option: T) => string;
  getKey?: (option: T) => string | number;
  scroll?: boolean;
  reverse?: boolean;
}) {
  const chips = options.map((option, index) => (
    <FilterChip
      key={reverse ? options.length - index - 1 : getKey(option)}
      label={getLabel(option)}
      selected={isSelected(option)}
      onPress={() => onSelect(option)}
    />
  ));

  return (
    <Field label={label}>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.rowWrap}>{chips}</View>
      )}
    </Field>
  );
}

/** Themed single-line text input matching the app's form styling. Use directly for
 * inputs with no stacked label (e.g. inline next to another field); use `TextField`
 * when the input needs its own labeled row. */
export function ThemedTextInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Input className="rounded-2xl border-0 bg-secondary px-4 py-2" style={style}>
      <InputField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={{ textAlign: 'right' }}
      />
    </Input>
  );
}

/** Labeled form row wrapping `ThemedTextInput`. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <Field label={label}>
      <ThemedTextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} />
    </Field>
  );
}

/** Labeled on/off row: label (plus optional hint) on the start side, switch on the end. */
export function SwitchField({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLabels}>
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {hint}
          </ThemedText>
        )}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchLabels: {
    flex: 1,
    gap: Spacing.half,
  },
  label: {
    textAlign: rtlTextAlign.start,
  },
  rowWrap: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rowScroll: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
  },
});
