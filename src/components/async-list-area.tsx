import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { rtlTextAlign } from '@/utils/rtl';

const DEFAULT_ERROR_MESSAGE = 'שגיאה בטעינת רשימת הקורסים — ודאו שיש חיבור לאינטרנט ונסו שוב';

// Bottom-sheet host (`FormSheet`) auto-sizes to its content, so a search list embedded in
// one needs its own fixed height rather than shrinking/growing with its content — otherwise
// the whole sheet visibly reflows every time the list swaps between its loading/error/
// results states. These bounds keep that fixed height sane across device sizes: capped so
// it doesn't dominate a tall screen, floored so it stays usable on a short one.
const MAX_LIST_HEIGHT = 320;
const MIN_LIST_HEIGHT = 180;
const LIST_HEIGHT_SCREEN_RATIO = 0.32;

/** Fixed height for a search list living inside an auto-sizing bottom sheet, scaled to the
 * device's window height. Pass the result as `style={{ height }}` on `AsyncListArea` (or
 * anything else that must not reflow as its content changes). */
export function useResponsiveListHeight() {
  const { height: windowHeight } = useWindowDimensions();
  return Math.min(MAX_LIST_HEIGHT, Math.max(MIN_LIST_HEIGHT, windowHeight * LIST_HEIGHT_SCREEN_RATIO));
}

/**
 * Stably-sized container for the loading/error/results switch shared by every async search
 * list (course catalog picker, study-group course select). All three states render inside
 * the same box — sized by `style`, which must resolve to a fixed size (a `height`, or `flex`
 * inside an already-bounded parent) rather than `maxHeight`/content-hugging — so swapping
 * between them while typing a search never reflows the surrounding sheet.
 */
export function AsyncListArea({
  isLoading,
  isError,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  style,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View style={[styles.area, style]}>
      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : isError ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {errorMessage}
        </ThemedText>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    justifyContent: 'center',
  },
  loading: {
    padding: Spacing.four,
  },
  empty: {
    textAlign: rtlTextAlign.center,
    padding: Spacing.three,
  },
});
