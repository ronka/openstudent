import { usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { posthog } from '@/utils/analytics';

/**
 * Fires a PostHog `$screen` event on every route change, derived from
 * expo-router's segments rather than react-navigation state (PostHog's
 * built-in screen autocapture doesn't work with expo-router).
 */
export function useScreenViewTracking() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    const screenName = screenNameFromSegments(segments);
    posthog.screen(screenName, { path: pathname });
  }, [pathname, segments]);
}

function screenNameFromSegments(segments: string[]): string {
  const named = segments
    .filter((segment) => !segment.startsWith('('))
    .map((segment) => segment.replace(/^\[|\]$/g, ''));

  return named.length > 0 ? named.join('_') : 'dashboard';
}
