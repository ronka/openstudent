import { ScrollView, StyleSheet, View } from 'react-native';

import { EntityRow } from '@/components/entity-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { rtlTextAlign } from '@/utils/rtl';

/**
 * The "עוד" tab's index — a menu into the secondary screens (plan, study-groups,
 * pomodoro, profile, settings). Android's native tab bar caps at 5 items, so these
 * live as pushed screens inside this tab's stack (see more/_layout.tsx) rather than
 * as their own tabs — a `hidden` trigger can't be navigated to.
 */
const MENU_ITEMS: { href: string; emoji: string; title: string; subtitle: string; event: string }[] = [
  { href: '/more/plan', emoji: '📅', title: 'תוכנית', subtitle: 'התקדמות בתואר וניהול קורסים', event: 'more_plan_tapped' },
  { href: '/more/study-groups', emoji: '👥', title: 'קבוצות', subtitle: 'קבוצות לימוד', event: 'more_study_groups_tapped' },
  { href: '/more/pomodoro', emoji: '🍅', title: 'פומודורו', subtitle: 'טיימר להתמקדות בלימודים', event: 'more_pomodoro_tapped' },
  { href: '/more/profile', emoji: '👤', title: 'פרופיל', subtitle: 'שם, פקולטה ונק״ז פטור', event: 'more_profile_tapped' },
  { href: '/more/settings', emoji: '⚙️', title: 'הגדרות', subtitle: 'התראות ופרטי האפליקציה', event: 'more_settings_tapped' },
];

export default function MoreScreen() {
  const screenPadding = useScreenPadding();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <ThemedText type="subtitle" style={styles.headline}>
          עוד
        </ThemedText>
        <View style={styles.list}>
          {MENU_ITEMS.map((item) => (
            <EntityRow
              key={item.href}
              href={item.href}
              title={item.title}
              subtitle={item.subtitle}
              leading={<ThemedText style={styles.emoji}>{item.emoji}</ThemedText>}
              trailing={<ThemedText style={styles.chevron}>‹</ThemedText>}
              onPress={() => posthog.capture(item.event)}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headline: {
    textAlign: rtlTextAlign.start,
  },
  list: {
    gap: Spacing.two,
  },
  emoji: {
    fontSize: 22,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
});
