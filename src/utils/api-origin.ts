// TODO: TEMPORARY — remove before/with the next native build.
//
// The production `origin` is configured in app.json (expo-router plugin), but
// that only ships inside a fresh native binary — it does NOT travel over OTA
// (`eas update`). The currently-installed build has no origin, so relative
// `/api/...` fetches have nothing to resolve against. This hardcodes the
// deployed EAS Hosting origin so those fetches work over OTA on the current build.
//
// To remove: set API_ORIGIN back to '' (relative paths resolve against the
// app.json origin in native builds) and delete the `apiUrl` usages / this file.
const API_ORIGIN = 'https://openstudent.expo.app';

/** Prefixes an absolute API path with the deployed origin (see TODO above). */
export function apiUrl(path: string): string {
  return `${API_ORIGIN}${path}`;
}
