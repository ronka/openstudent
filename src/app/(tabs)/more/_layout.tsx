import { Stack } from 'expo-router';

/**
 * The "עוד" tab is a stack: its index is the menu, and the secondary screens
 * (plan, study-groups, pomodoro, profile, settings) are pushed on top from there.
 *
 * Android native tabs cap the bar at 5 items and — critically — a `hidden` trigger
 * "cannot be navigated to in any way" (expo-router docs). So these screens can't be
 * hidden tabs; they live inside this stack instead, which is the sanctioned pattern.
 *
 * Screens render their own hero titles and use `useScreenPadding` for the top safe
 * area, so headers stay hidden here (back via swipe / hardware back / re-tapping the
 * "עוד" tab). study-groups keeps its own inner-stack header.
 */
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
