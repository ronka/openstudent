import { useSyncExternalStore } from 'react';

import { getItemSync, removeItemSync, setItemSync } from './kv-storage';

const ONBOARDING_KEY = 'onboarding.completed';

let completed = getItemSync(ONBOARDING_KEY) === 'true';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasCompletedOnboarding(): boolean {
  return completed;
}

export function markOnboardingComplete(): void {
  completed = true;
  setItemSync(ONBOARDING_KEY, 'true');
  notify();
}

export function resetOnboarding(): void {
  completed = false;
  removeItemSync(ONBOARDING_KEY);
  notify();
}

/** Reactive read for route gating in `_layout.tsx` — updates `Stack.Protected` guards
 * the moment onboarding finishes or is reset, with no extra navigation call needed. */
export function useHasCompletedOnboarding(): boolean {
  return useSyncExternalStore(subscribe, hasCompletedOnboarding);
}
