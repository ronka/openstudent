/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Keys accepted by `ThemedView`/`ThemedText`'s `type`/`themeColor` props, mapped to
 * gluestack/shadcn className tokens inside those components. */
export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'textSecondary'
  | 'accent'
  | 'accentSoft'
  | 'card'
  | 'border';

/**
 * Resolved color values for native chrome that can't be styled via NativeWind
 * `className` (native tab bar config, `SymbolView`'s `tintColor`). Mirrors the
 * `--background` / `--secondary` / `--foreground` tokens in `global.css` - keep both
 * in sync when the palette changes.
 */
export const NativeChromeColors = {
  light: { background: 'rgb(255, 255, 255)', backgroundElement: 'rgb(245, 245, 245)', text: 'rgb(10, 10, 10)' },
  dark: { background: 'rgb(10, 10, 10)', backgroundElement: 'rgb(38, 38, 38)', text: 'rgb(250, 250, 250)' },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
