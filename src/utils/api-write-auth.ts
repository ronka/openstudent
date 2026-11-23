/**
 * Write-endpoint auth for the public API (study-group submit/report, shared deadlines).
 *
 * HONEST SCOPE: the client token is an `EXPO_PUBLIC_*` var, so it is inlined into the app
 * bundle and anyone who unpacks the app can read it. This is NOT a secret. It only raises
 * the bar against casual/scripted abuse. The real protection is the per-install rate limit
 * and strict validation in `shared-deadlines`, which stay in place.
 *
 * ROLLOUT SAFETY: apps already in the wild send no token. So by default (compat mode) a
 * request with NO Authorization header is allowed; a request that sends a WRONG token is
 * always rejected. Only once `API_WRITE_ENFORCE=true` is set does a missing token fail.
 */

export type WriteAuthResult = 'ok' | 'unauthorized';

const BEARER_PREFIX = 'Bearer ';

/** Constant-time string comparison (no early exit on the first differing character). */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function evaluateWriteAuth(
  request: Request,
  { expectedToken, enforce }: { expectedToken?: string; enforce: boolean },
): WriteAuthResult {
  const header = request.headers.get('authorization');

  if (!header) {
    // No credentials at all: legacy client. Allowed only while not enforcing, and
    // enforcing without a configured token fails closed.
    if (!enforce) return 'ok';
    return 'unauthorized';
  }

  // A credential was sent: it must be exactly the configured bearer token.
  if (!expectedToken || !header.startsWith(BEARER_PREFIX)) return 'unauthorized';
  return constantTimeEqual(header.slice(BEARER_PREFIX.length), expectedToken) ? 'ok' : 'unauthorized';
}

/** Reads the rollout config from the server environment. */
export function writeAuthConfigFromEnv(env: Record<string, string | undefined> = process.env) {
  return { expectedToken: env.API_WRITE_TOKEN, enforce: env.API_WRITE_ENFORCE === 'true' };
}

/** Returns a JSON 401 response if the write must be rejected, otherwise null. */
export function rejectUnauthorizedWrite(request: Request, env?: Record<string, string | undefined>): Response | null {
  return evaluateWriteAuth(request, writeAuthConfigFromEnv(env)) === 'ok'
    ? null
    : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Strict check: a correct bearer token is required (equivalent to enforcing). */
export function isApiWriteAuthorized(request: Request, expectedToken = process.env.API_WRITE_TOKEN): boolean {
  if (!expectedToken) return false;
  return evaluateWriteAuth(request, { expectedToken, enforce: true }) === 'ok';
}
