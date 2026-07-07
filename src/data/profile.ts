import { useSyncExternalStore } from 'react';

import { getItemSync, removeItemSync, setItemSync } from './kv-storage';

const NAME_KEY = 'profile.name';

let name = getItemSync(NAME_KEY) ?? '';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getName(): string {
  return name;
}

export function setName(next: string): void {
  const trimmed = next.trim();
  name = trimmed;
  if (trimmed) setItemSync(NAME_KEY, trimmed);
  else removeItemSync(NAME_KEY);
  notify();
}

/** Reactive read for the dashboard greeting — re-renders the moment the name is set. */
export function useName(): string {
  return useSyncExternalStore(subscribe, getName);
}
