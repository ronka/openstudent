// `window` doesn't exist during Expo Router's server-side HTML prerender (web.output:
// "server" always prerenders, even though this app doesn't rely on that HTML - only
// the client bundle, loaded after hydration, actually reads/writes storage).
const hasWindow = typeof window !== 'undefined';

export function getItemSync(key: string): string | null {
  return hasWindow ? window.localStorage.getItem(key) : null;
}

export function setItemSync(key: string, value: string): void {
  if (hasWindow) window.localStorage.setItem(key, value);
}

export function removeItemSync(key: string): void {
  if (hasWindow) window.localStorage.removeItem(key);
}
