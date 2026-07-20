import * as Notifications from 'expo-notifications';
import { useSyncExternalStore } from 'react';

import { getItemSync, setItemSync } from './kv-storage';
import { reconcileNotifications } from './notification-scheduler';

/**
 * Notification preference + prompt-tracking, mirroring `profile.ts` (kv-store scalar +
 * `useSyncExternalStore`). Two independent flags share one listener set:
 *
 * - `settings.notificationsEnabled` — `'true' | 'false' | unset`. Unset = never asked;
 *   treated as off by the toggle. Set the moment the user opts in or out.
 * - `notifications.promptSeen` — `'true'` once the onboarding step or the one-time
 *   existing-user dashboard prompt has been shown, so it appears exactly once.
 */

const ENABLED_KEY = 'settings.notificationsEnabled';
const PROMPT_SEEN_KEY = 'notifications.promptSeen';

let enabled = getItemSync(ENABLED_KEY) === 'true';
let promptSeen = getItemSync(PROMPT_SEEN_KEY) === 'true';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotificationsEnabled(): boolean {
  return enabled;
}

/** Persist the enabled flag. Callers still own scheduling — flip the flag here, then
 * reconcile (or disable) so the scheduled set follows. */
export function setNotificationsEnabled(value: boolean): void {
  enabled = value;
  setItemSync(ENABLED_KEY, value ? 'true' : 'false');
  notify();
}

export function getPromptSeen(): boolean {
  return promptSeen;
}

export function markPromptSeen(): void {
  if (promptSeen) return;
  promptSeen = true;
  setItemSync(PROMPT_SEEN_KEY, 'true');
  notify();
}

/** Reactive read for the settings toggle. */
export function useNotificationsEnabled(): boolean {
  return useSyncExternalStore(subscribe, getNotificationsEnabled);
}

/** Reactive read for the existing-user dashboard prompt — hides it the moment it's seen. */
export function usePromptSeen(): boolean {
  return useSyncExternalStore(subscribe, getPromptSeen);
}

/**
 * Request OS permission and, on grant, flip the flag on + reconcile the schedule. On
 * denial, flip the flag off and return the status so the UI can steer the user to OS
 * settings (`Linking.openSettings()`). Safe to call from onboarding or the settings row.
 */
export async function enableNotifications(): Promise<Notifications.PermissionStatus> {
  const response = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  if (response.granted) {
    setNotificationsEnabled(true);
    void reconcileNotifications();
  } else {
    setNotificationsEnabled(false);
  }
  return response.status;
}
