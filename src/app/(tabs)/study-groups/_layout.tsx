import { Stack } from 'expo-router';

export default function StudyGroupsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'קבוצות לימוד' }} />
    </Stack>
  );
}
