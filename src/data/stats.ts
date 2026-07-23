/**
 * Derived dashboard statistics. Pure functions over the collections returned by the
 * store hooks (`src/data/store.ts`) so the homepage stays declarative and the math is
 * reusable/testable. Nothing here reads the store directly — always pass the arrays in.
 */

import { DEGREE_CREDITS_TARGET } from './constants';
import { deriveCourseStatus, getCurrentSemester, type CurrentSemester } from './semester';
import type { Assignment, Course, Exam } from './types';

export interface DegreeStats {
  /** Credits across the courses the student has entered — planned + studying + passed.
   * This is "how much is on the plan", not the degree requirement: use
   * `DEGREE_CREDITS_TARGET` for progress, never this. */
  totalCredits: number;
  /** Credits from logged courses whose status is `passed` — recognition for prior
   * studies is *not* in here (it has no course rows); see `completedCredits`. */
  passedCredits: number;
  /** נק״ז credited for prior studies elsewhere, straight from the profile setting. */
  exemptCredits: number;
  /** `passedCredits + exemptCredits` — everything that counts toward the degree, and
   * the numerator of `degreePct`. This is what the UI should show beside the target. */
  completedCredits: number;
  /** Completed credits / `DEGREE_CREDITS_TARGET`, clamped to 0..1. Deliberately *not*
   * over `totalCredits`: that would make the bar mean "% of the courses I logged",
   * hitting 100% after three passed courses and dropping every time one is added. */
  degreePct: number;
  passedCount: number;
  studyingCount: number;
  plannedCount: number;
  totalCount: number;
}

/**
 * `exemptCredits` is passed in (from `profile.ts`) rather than read here — this module
 * stays pure so the dashboard, the plan tab and the widget can all reuse it.
 */
export function degreeStats(
  courses: Course[],
  current: CurrentSemester = getCurrentSemester(),
  exemptCredits = 0
): DegreeStats {
  let totalCredits = 0;
  let passedCredits = 0;
  let passedCount = 0;
  let studyingCount = 0;
  let plannedCount = 0;

  for (const course of courses) {
    const status = deriveCourseStatus(course, current);
    // Terminal non-passing outcomes are out of the degree entirely — they're neither
    // progress nor part of the plan's credit total.
    if (status === 'failed' || status === 'abandoned') continue;
    const credits = course.credits ?? 0;
    totalCredits += credits;
    if (status === 'passed') {
      passedCredits += credits;
      passedCount += 1;
    } else if (status === 'studying') {
      studyingCount += 1;
    } else if (status === 'planned') {
      plannedCount += 1;
    }
  }

  const completedCredits = passedCredits + exemptCredits;

  return {
    totalCredits,
    passedCredits,
    exemptCredits,
    completedCredits,
    // Clamped: passing more than the target (extra courses, exemptions) still reads 100%.
    degreePct: Math.min(completedCredits / DEGREE_CREDITS_TARGET, 1),
    passedCount,
    studyingCount,
    plannedCount,
    totalCount: courses.length,
  };
}

/**
 * Exams whose grades carry numeric weight. Grades of courses marked "עובר בינארי"
 * are dropped: the course still counts as passed for credits, but its grade must not
 * move the average. Both the average and the grade trend go through here so the
 * homepage, the chart and the widget can never disagree.
 */
export function examsForGpa(exams: Exam[], courses: Course[]): Exam[] {
  const binaryPassCourseIds = new Set(courses.filter((course) => course.binaryPass).map((course) => course.id));
  if (binaryPassCourseIds.size === 0) return exams;
  return exams.filter((exam) => !binaryPassCourseIds.has(exam.courseId));
}

export interface GpaStats {
  /** Plain average grade over graded exams; 0 when none. Exams carry no credits,
   * so this is unweighted — consistent with the per-exam min/max/count beside it. */
  gpa: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Average exam grade (the "ממוצע"). Sourced from exam grades rather than course
 * grades so it lines up with the grade-trend chart, which plots each graded exam.
 * A course with multiple graded exams (e.g. moed A + moed B) contributes each one.
 * `courses` is needed to drop "עובר בינארי" courses (see `examsForGpa`).
 */
export function gpaStats(exams: Exam[], courses: Course[]): GpaStats {
  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const exam of examsForGpa(exams, courses)) {
    if (exam.grade === undefined) continue;
    sum += exam.grade;
    count += 1;
    min = Math.min(min, exam.grade);
    max = Math.max(max, exam.grade);
  }

  return {
    gpa: count > 0 ? sum / count : 0,
    min: count > 0 ? min : 0,
    max: count > 0 ? max : 0,
    count,
  };
}

export interface AssignmentBreakdown {
  todo: number;
  done: number;
  /** Alias for todo, kept for readability at call sites. */
  open: number;
  total: number;
}

export function assignmentBreakdown(assignments: Assignment[]): AssignmentBreakdown {
  let todo = 0;
  let done = 0;

  for (const assignment of assignments) {
    if (assignment.status === 'todo') todo += 1;
    else if (assignment.status === 'done') done += 1;
  }

  return { todo, done, open: todo, total: assignments.length };
}

export interface GradePoint {
  date: string;
  grade: number;
  title: string;
}

/** Graded exams sorted oldest → newest, for the grade-trend mini chart. Mirrors the
 * average: "עובר בינארי" grades are left out so the chart matches the number above it. */
export function gradeTimeline(exams: Exam[], courses: Course[]): GradePoint[] {
  return examsForGpa(exams, courses)
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

/** Open (non-done) assignments, earliest due date first; missing due dates sort last. */
export function upcomingAssignmentsSorted(assignments: Assignment[], limit?: number): Assignment[] {
  const sorted = assignments
    .filter((a) => a.status !== 'done')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
