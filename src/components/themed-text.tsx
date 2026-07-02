import { Platform, StyleSheet, type TextProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { Fonts, ThemeColor } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  className?: string;
};

// Old ThemeColor keys -> gluestack/shadcn text tokens (restyle: indigo accent -> neutral primary).
const TEXT_CLASSNAMES: Record<ThemeColor, string> = {
  text: 'text-foreground',
  background: 'text-background',
  backgroundElement: 'text-secondary-foreground',
  backgroundSelected: 'text-accent-foreground',
  textSecondary: 'text-muted-foreground',
  accent: 'text-primary',
  accentSoft: 'text-accent-foreground',
  card: 'text-card',
  border: 'text-border',
};

export function ThemedText({ style, type = 'default', themeColor, className, ...rest }: ThemedTextProps) {
  // linkPrimary defaults to the (neutral) accent color unless overridden.
  const defaultThemeColor: ThemeColor = type === 'linkPrimary' ? 'accent' : 'text';

  return (
    <Text
      className={[TEXT_CLASSNAMES[themeColor ?? defaultThemeColor], className].filter(Boolean).join(' ')}
      style={[
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
