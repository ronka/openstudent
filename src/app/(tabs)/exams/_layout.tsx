import { Stack } from 'expo-router';

export default function ExamsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'מבחנים' }} />
    </Stack>
  );
}
