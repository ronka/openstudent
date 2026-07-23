import { useSyncExternalStore } from 'react';

import { DEGREE_CREDITS_TARGET } from './constants';
import { getItemSync, removeItemSync, setItemSync } from './kv-storage';

const NAME_KEY = 'profile.name';
const FACULTY_KEY = 'profile.faculty';
const EXEMPT_CREDITS_KEY = 'profile.exemptCredits';

function readExemptCredits(): number {
  const stored = Number(getItemSync(EXEMPT_CREDITS_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

let name = getItemSync(NAME_KEY) ?? '';
let faculty = getItemSync(FACULTY_KEY) ?? '';
let exemptCredits = readExemptCredits();
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

/**
 * נק״ז the student was credited for prior studies elsewhere (הנדסאי, another college
 * or university). They count toward the degree just like passed courses, but have no
 * course rows behind them — without this the progress bar under-reports the real state.
 */
export function getExemptCredits(): number {
  return exemptCredits;
}

export function setExemptCredits(next: number): void {
  // Defensive: the settings field hands us a parsed string, so NaN/negative/absurd
  // values are all reachable. Clamp rather than reject so the input can't get stuck.
  const value = Number.isFinite(next) ? Math.min(Math.max(next, 0), DEGREE_CREDITS_TARGET) : 0;
  exemptCredits = value;
  if (value > 0) setItemSync(EXEMPT_CREDITS_KEY, String(value));
  else removeItemSync(EXEMPT_CREDITS_KEY);
  notify();
}

export function useExemptCredits(): number {
  return useSyncExternalStore(subscribe, getExemptCredits);
}
