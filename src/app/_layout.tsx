import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useHasCompletedOnboarding } from '@/data/onboarding';
import { useScreenViewTracking } from '@/hooks/use-screen-view';
import { posthog } from '@/utils/analytics';
import { initializeRTL } from '@/utils/rtl';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/src/global.css';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const colorScheme = useColorScheme();
  const onboarded = useHasCompletedOnboarding();

  useScreenViewTracking();

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initializeRTL();
  }, []);

  // The catalog is effectively static within a session (regenerated ~once per
  // semester), so keep it fresh for a long time and avoid refetching on remount.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 60,
            gcTime: 1000 * 60 * 60 * 24,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: false }}>
          <AppNavigation />
        </PostHogProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
