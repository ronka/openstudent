import { Stack } from 'expo-router';

export default function CoursesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'קורסים' }} />
    </Stack>
  );
}
