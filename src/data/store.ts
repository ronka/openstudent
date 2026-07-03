import { useMemo, useSyncExternalStore } from 'react';

import { getItemSync, setItemSync } from './kv-storage';
import type { Assignment, Course, Exam } from './types';

function hydrate<T>(key: string, fallback: T[]): T[] {
  const raw = getItemSync(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

/**
 * In-memory collection with a subscribe/snapshot interface, so screens read through
 * hooks rather than the raw arrays. Hydrated once from a persisted JSON snapshot under
 * `key` and written through on every change, so call sites never touch storage directly.
 */
function createCollection<T extends { id: string }>(key: string, initial: T[]) {
  let items = hydrate(key, initial);
  const listeners = new Set<() => void>();

  function getSnapshot() {
    return items;
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notify() {
    setItemSync(key, JSON.stringify(items));
    listeners.forEach((listener) => listener());
  }
  function add(item: T) {
    items = [...items, item];
    notify();
  }
  /** Add several items as a single update (one snapshot change, one notify). */
  function addMany(newItems: T[]) {
    if (newItems.length === 0) return;
    items = [...items, ...newItems];
    notify();
  }
  function update(id: string, patch: Partial<T>) {
    items = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    notify();
  }
  function remove(id: string) {
    items = items.filter((item) => item.id !== id);
    notify();
  }
  function reset() {
    items = initial;
    notify();
  }

  return { getSnapshot, subscribe, add, addMany, update, remove, reset };
}

export const coursesCollection = createCollection<Course>('data.courses', []);
export const assignmentsCollection = createCollection<Assignment>('data.assignments', []);
export const examsCollection = createCollection<Exam>('data.exams', []);

export function useCourses(): Course[] {
  return useSyncExternalStore(coursesCollection.subscribe, coursesCollection.getSnapshot);
}

export function useAssignments(): Assignment[] {
  return useSyncExternalStore(assignmentsCollection.subscribe, assignmentsCollection.getSnapshot);
}

export function useExams(): Exam[] {
  return useSyncExternalStore(examsCollection.subscribe, examsCollection.getSnapshot);
}

export function useCourse(id: string | undefined): Course | undefined {
  const courses = useCourses();
  return courses.find((course) => course.id === id);
}

export function useAssignment(id: string | undefined): Assignment | undefined {
  const assignments = useAssignments();
  return assignments.find((assignment) => assignment.id === id);
}

export function useAssignmentsByCourse(courseId: string | undefined): Assignment[] {
  const assignments = useAssignments();
  return useMemo(() => assignments.filter((item) => item.courseId === courseId), [assignments, courseId]);
}

export function useExamsByCourse(courseId: string | undefined): Exam[] {
  const exams = useExams();
  return useMemo(() => exams.filter((item) => item.courseId === courseId), [exams, courseId]);
}

export function resetAllData() {
  coursesCollection.reset();
  assignmentsCollection.reset();
  examsCollection.reset();
}
