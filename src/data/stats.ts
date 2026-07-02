/**
 * Derived dashboard statistics. Pure functions over the collections returned by the
 * store hooks (`src/data/store.ts`) so the homepage stays declarative and the math is
 * reusable/testable. Nothing here reads the store directly — always pass the arrays in.
 */

import type { Assignment, Course, Exam } from './types';

export interface DegreeStats {
  totalCredits: number;
  passedCredits: number;
  /** Passed credits / total credits, clamped to 0..1 (0 when there are no credits). */
  degreePct: number;
  passedCount: number;
  studyingCount: number;
  plannedCount: number;
  totalCount: number;
}

export function degreeStats(courses: Course[]): DegreeStats {
  let totalCredits = 0;
  let passedCredits = 0;
  let passedCount = 0;
  let studyingCount = 0;
  let plannedCount = 0;

  for (const course of courses) {
    const credits = course.credits ?? 0;
    totalCredits += credits;
    if (course.status === 'passed') {
      passedCredits += credits;
      passedCount += 1;
    } else if (course.status === 'studying') {
      studyingCount += 1;
    } else if (course.status === 'planned') {
      plannedCount += 1;
    }
  }

  return {
    totalCredits,
    passedCredits,
    degreePct: totalCredits > 0 ? passedCredits / totalCredits : 0,
    passedCount,
    studyingCount,
    plannedCount,
    totalCount: courses.length,
  };
}

export interface GpaStats {
  /** Credit-weighted average grade over passed courses that have a grade; 0 when none. */
  gpa: number;
  min: number;
  max: number;
  count: number;
}

export function gpaStats(courses: Course[]): GpaStats {
  let weightedSum = 0;
  let creditSum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const course of courses) {
    if (course.status !== 'passed' || course.grade === undefined) continue;
    // Weight by credits, but fall back to 1 so credit-less courses still count.
    const weight = course.credits ?? 1;
    weightedSum += course.grade * weight;
    creditSum += weight;
    count += 1;
    min = Math.min(min, course.grade);
    max = Math.max(max, course.grade);
  }

  return {
    gpa: creditSum > 0 ? weightedSum / creditSum : 0,
    min: count > 0 ? min : 0,
    max: count > 0 ? max : 0,
    count,
  };
}

export interface AssignmentBreakdown {
  todo: number;
  in_progress: number;
  done: number;
  /** todo + in_progress */
  open: number;
  total: number;
}

export function assignmentBreakdown(assignments: Assignment[]): AssignmentBreakdown {
  let todo = 0;
  let in_progress = 0;
  let done = 0;

  for (const assignment of assignments) {
    if (assignment.status === 'todo') todo += 1;
    else if (assignment.status === 'in_progress') in_progress += 1;
    else if (assignment.status === 'done') done += 1;
  }

  return { todo, in_progress, done, open: todo + in_progress, total: assignments.length };
}

export interface GradePoint {
  date: string;
  grade: number;
  title: string;
}

/** Graded exams sorted oldest → newest, for the grade-trend mini chart. */
export function gradeTimeline(exams: Exam[]): GradePoint[] {
  return exams
    .filter((exam): exam is Exam & { grade: number } => exam.grade !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((exam) => ({ date: exam.date, grade: exam.grade, title: exam.title }));
}

/** Ungraded exams sorted by date ascending (earliest first). */
export function upcomingExamsSorted(exams: Exam[]): Exam[] {
  return exams
    .filter((exam) => exam.grade === undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
}
