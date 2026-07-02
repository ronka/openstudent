import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';

/**
 * Single source of truth for a full-screen scroll/list content padding.
 *
 * Keeps top (status bar / notch) and bottom (native tab bar / home indicator)
 * spacing consistent across every screen. Spread the result into a
 * `contentContainerStyle` for `ScrollView`/`FlatList` screens that render
 * under the tab bar without a navigation header.
 *
 * - Header-less screens: spread the whole object (`{...screenPadding}`).
 * - Screens with a native header: use only `paddingBottom` (the header already
 *   reserves the top safe area).
 */
export function useScreenPadding() {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
    }),
    [insets.top, insets.bottom]
  );
}
