import { useSyncExternalStore } from 'react';

import { getItemSync, removeItemSync, setItemSync } from './kv-storage';

const NAME_KEY = 'profile.name';
const FACULTY_KEY = 'profile.faculty';

let name = getItemSync(NAME_KEY) ?? '';
let faculty = getItemSync(FACULTY_KEY) ?? '';
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

/** The student's faculty (פקולטה), chosen from the course catalog; '' when unset. */
export function getFaculty(): string {
  return faculty;
}

export function setFaculty(next: string): void {
  const trimmed = next.trim();
  faculty = trimmed;
  if (trimmed) setItemSync(FACULTY_KEY, trimmed);
  else removeItemSync(FACULTY_KEY);
  notify();
}

export function useFaculty(): string {
  return useSyncExternalStore(subscribe, getFaculty);
}
