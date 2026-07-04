import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACTION_WIDTH = 88;

/**
 * Wraps a row so it can be swiped sideways to reveal a destructive "delete" action.
 * Swiping past the threshold (or tapping the revealed button) calls `onDelete`; the
 * panel closes itself afterwards so the list settles back cleanly.
 */
export function SwipeableRow({
  children,
  onDelete,
  deleteLabel = 'מחק',
}: {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  function handleDelete() {
    swipeableRef.current?.close();
    onDelete();
  }

  function renderRightActions(_progress: SharedValue<number>, translation: SharedValue<number>) {
    return (
      <DeleteAction translation={translation} label={deleteLabel} onPress={handleDelete} />
    );
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        // A full swipe-open on the delete side removes the row without a second tap.
        if (direction === 'right') handleDelete();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function DeleteAction({
  translation,
  label,
  onPress,
}: {
  translation: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  // Pin the action to the row's trailing edge as it's dragged open.
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + ACTION_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionContainer, style]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <ThemedText style={styles.actionLabel}>{label}</ThemedText>
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    width: ACTION_WIDTH,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: Spacing.three,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
