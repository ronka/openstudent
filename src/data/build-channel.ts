export const PRODUCTION_CHANNEL = 'production';

/**
 * Which kind of build is running. `updatesChannel` is baked into the native build and
 * survives OTA updates, so it wins over the bundle-time `appEnv`. A dev bundle is always
 * `development`, even on a device installed from another channel.
 */
export function resolveBuildChannel({
  isDev,
  updatesChannel,
  appEnv,
}: {
  isDev: boolean;
  updatesChannel?: string | null;
  appEnv?: string;
}): string {
  if (isDev) return 'development';
  return updatesChannel || appEnv || 'unknown';
}

export function shouldSendAnalytics(channel: string): boolean {
  return channel === PRODUCTION_CHANNEL;
}
