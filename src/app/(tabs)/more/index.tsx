import { Link, type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

/** Secondary destinations live in this tab's stack because native tabs are limited to five. */
const MENU_ITEMS = [
  { href: '/more/plan', emoji: '📅', title: 'תכנון התואר', event: 'more_plan_tapped' },
  { href: '/more/study-groups', emoji: '👥', title: 'קבוצות לימוד', event: 'more_study_groups_tapped' },
  { href: '/more/pomodoro', emoji: '🍅', title: 'פומודורו', event: 'more_pomodoro_tapped' },
  { href: '/more/profile', emoji: '👤', title: 'פרופיל', event: 'more_profile_tapped' },
  { href: '/more/settings', emoji: '⚙️', title: 'הגדרות', event: 'more_settings_tapped' },
];

const PROJECT_LINKS = [
  {
    url: 'https://openstudent.co.il/github',
    title: 'רוצים להוסיף פיצ׳ר?',
    action: 'תרמו ב-GitHub',
    event: 'more_github_tapped',
  },
  {
    url: 'https://openstudent.co.il/zero-to-app',
    title: 'בונים אפליקציה משלכם?',
    action: 'גלו את Zero to App',
    event: 'more_zero_to_app_tapped',
  },
];

export default function MoreScreen() {
  const screenPadding = useScreenPadding();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <ThemedText type="subtitle" style={styles.headline}>
          עוד
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.menuGroup}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.href}>
              <Link href={item.href as Href} asChild>
                <Pressable
                  onPress={() => posthog.capture(item.event)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={styles.menuRow}>
                    <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                    <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.chevron}>‹</ThemedText>
                  </View>
                </Pressable>
              </Link>
              {index < MENU_ITEMS.length - 1 && <ThemedView type="border" style={styles.divider} />}
            </View>
          ))}
        </ThemedView>

        <View style={styles.projectSection}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            בונים יחד
          </ThemedText>
          <ThemedView type="card" className="border-border" style={styles.projectGroup}>
            {PROJECT_LINKS.map((item, index) => (
              <View key={item.url}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${item.title} ${item.action}`}
                  onPress={() => {
                    posthog.capture(item.event);
                    void Linking.openURL(item.url);
                  }}
                  style={({ pressed }) => [styles.projectRow, pressed && styles.pressed]}>
                  <View style={styles.projectText}>
                    <ThemedText type="smallBold" style={styles.projectTitle}>{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.projectAction}>
                      {item.action}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.externalArrow}>↗</ThemedText>
                </Pressable>
                {index < PROJECT_LINKS.length - 1 && <ThemedView type="border" style={styles.divider} />}
              </View>
            ))}
          </ThemedView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headline: { textAlign: rtlTextAlign.start },
  menuGroup: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  emoji: { fontSize: 19, width: 26, textAlign: 'center' },
  menuTitle: { flex: 1, textAlign: rtlTextAlign.start },
  chevron: { fontSize: 22, lineHeight: 24, fontWeight: '700' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
  },
  projectSection: { gap: Spacing.two },
  sectionTitle: { textAlign: rtlTextAlign.start, paddingHorizontal: Spacing.one },
  projectGroup: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  projectRow: {
    flexDirection: rtlFlexDirection.row,
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  projectText: { flex: 1, gap: Spacing.half },
  projectTitle: { textAlign: rtlTextAlign.start },
  projectAction: { textAlign: rtlTextAlign.start },
  externalArrow: { fontSize: 20, lineHeight: 24 },
  pressed: { opacity: 0.7 },
});
