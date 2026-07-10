import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

export const posthog = new PostHog(apiKey ?? '', {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  persistence: Platform.OS === 'web' ? 'memory' : 'file',
  captureAppLifecycleEvents: true,
  disabled: !apiKey,
});
