import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { NativeChromeColors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = NativeChromeColors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
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

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>תוכנית</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event_note" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="pomodoro">
        <NativeTabs.Trigger.Label>פומודורו</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="timer" md="timer" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>הגדרות</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
