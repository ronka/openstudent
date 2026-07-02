import { Pressable, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

export function TaskCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={Spacing.two} style={({ pressed }) => pressed && styles.pressed}>
      <Box
        className={checked ? 'bg-primary border-primary' : 'border-border bg-transparent'}
        style={styles.box}>
        {checked && (
          <Text className="text-primary-foreground" style={styles.check}>
            ✓
          </Text>
        )}
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
