import { type ViewProps } from 'react-native';

import { Box } from '@/components/ui/box';
import { ThemeColor } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  className?: string;
};

// Old ThemeColor keys -> gluestack/shadcn background tokens (restyle: indigo accent -> neutral primary).
const BACKGROUND_CLASSNAMES: Record<ThemeColor, string> = {
  text: 'bg-foreground',
  background: 'bg-background',
  backgroundElement: 'bg-secondary',
  backgroundSelected: 'bg-accent',
  textSecondary: 'bg-muted-foreground',
  accent: 'bg-primary',
  accentSoft: 'bg-accent',
  card: 'bg-card',
  border: 'bg-border',
};

export function ThemedView({ style, lightColor, darkColor, type, className, ...otherProps }: ThemedViewProps) {
  return (
    <Box
      className={[BACKGROUND_CLASSNAMES[type ?? 'background'], className].filter(Boolean).join(' ')}
      style={style}
      {...otherProps}
    />
  );
}
