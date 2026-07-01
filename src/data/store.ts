import { useMemo, useSyncExternalStore } from 'react';

import { seedAssignments, seedCourses, seedExams, seedMaterials, seedRecordings } from './seed';
import type { Assignment, Course, Exam, Material, Recording } from './types';

/**
 * In-memory collection with a subscribe/snapshot interface, so screens read through
 * hooks rather than the raw seed arrays. Swapping this for a SQLite/AsyncStorage-backed
 * implementation later should not require changing any call site.
 */
function createCollection<T extends { id: string }>(initial: T[]) {
  let items = initial;
  const listeners = new Set<() => void>();

  function getSnapshot() {
    return items;
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notify() {
    listeners.forEach((listener) => listener());
  }
  function add(item: T) {
    items = [...items, item];
    notify();
  }
  function update(id: string, patch: Partial<T>) {
    items = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    notify();
  }
  function reset() {
    items = initial;
    notify();
  }

  return { getSnapshot, subscribe, add, update, reset };
}

export const coursesCollection = createCollection<Course>(seedCourses);
export const assignmentsCollection = createCollection<Assignment>(seedAssignments);
export const examsCollection = createCollection<Exam>(seedExams);
export const recordingsCollection = createCollection<Recording>(seedRecordings);
export const materialsCollection = createCollection<Material>(seedMaterials);

export function useCourses(): Course[] {
  return useSyncExternalStore(coursesCollection.subscribe, coursesCollection.getSnapshot);
}

export function useAssignments(): Assignment[] {
  return useSyncExternalStore(assignmentsCollection.subscribe, assignmentsCollection.getSnapshot);
}

export function useExams(): Exam[] {
  return useSyncExternalStore(examsCollection.subscribe, examsCollection.getSnapshot);
}

export function useRecordings(): Recording[] {
  return useSyncExternalStore(recordingsCollection.subscribe, recordingsCollection.getSnapshot);
}

export function useMaterials(): Material[] {
  return useSyncExternalStore(materialsCollection.subscribe, materialsCollection.getSnapshot);
}

export function useCourse(id: string | undefined): Course | undefined {
  const courses = useCourses();
  return courses.find((course) => course.id === id);
}

export function useAssignmentsByCourse(courseId: string | undefined): Assignment[] {
  const assignments = useAssignments();
  return useMemo(() => assignments.filter((item) => item.courseId === courseId), [assignments, courseId]);
}

export function useExamsByCourse(courseId: string | undefined): Exam[] {
  const exams = useExams();
  return useMemo(() => exams.filter((item) => item.courseId === courseId), [exams, courseId]);
}

export function useRecordingsByCourse(courseId: string | undefined): Recording[] {
  const recordings = useRecordings();
  return useMemo(() => recordings.filter((item) => item.courseId === courseId), [recordings, courseId]);
}

export function useMaterialsByCourse(courseId: string | undefined): Material[] {
  const materials = useMaterials();
  return useMemo(() => materials.filter((item) => item.courseId === courseId), [materials, courseId]);
}

export function resetAllData() {
  coursesCollection.reset();
  assignmentsCollection.reset();
  examsCollection.reset();
  recordingsCollection.reset();
  materialsCollection.reset();
}
