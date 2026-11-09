import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

import { resolveBuildChannel, shouldSendAnalytics } from '@/data/build-channel';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

// The channel comes from the native build, so it stays correct after an OTA update.
const buildChannel = resolveBuildChannel({
  isDev: __DEV__,
  updatesChannel: Updates.channel,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
});

export const posthog = new PostHog(apiKey ?? '', {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  persistence: Platform.OS === 'web' ? 'memory' : 'file',
  captureAppLifecycleEvents: true,
  disabled: !apiKey || !shouldSendAnalytics(buildChannel),
});

posthog.register({ build_channel: buildChannel });
