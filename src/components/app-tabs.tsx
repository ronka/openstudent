import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { I18nManager, useColorScheme } from 'react-native';

import { NativeChromeColors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = NativeChromeColors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
      unstable_nativeProps={{ direction: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>בית</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="courses">
        <NativeTabs.Trigger.Label>קורסים</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.closed" md="school" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="assignments">
        <NativeTabs.Trigger.Label>מטלות</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="exams">
        <NativeTabs.Trigger.Label>מבחנים</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="graduationcap" md="school" />
      </NativeTabs.Trigger>

      {/* Android's native tab bar caps at 5 items. The remaining screens (plan,
          study-groups, pomodoro, profile, settings) live inside this "עוד" tab's
          stack — a `hidden` trigger cannot be navigated to, so they can't be tabs. */}
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>עוד</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
