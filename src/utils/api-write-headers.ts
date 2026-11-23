/**
 * Client side of write auth. The token comes from `EXPO_PUBLIC_API_WRITE_TOKEN`, which is
 * inlined into the bundle at `eas update --environment production` time. It is therefore
 * visible to anyone who inspects the app — not a secret (see `api-write-auth.ts`).
 * Never log or send this value to analytics.
 */
export function apiWriteHeaders(token: string | undefined = process.env.EXPO_PUBLIC_API_WRITE_TOKEN): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
