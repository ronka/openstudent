/**
 * Pure, serializable prop builders for the three home-screen widgets.
 *
 * Widgets can't fetch or compute data themselves — the app's JS process pushes
 * pre-computed props via `Widget.updateTimeline`. Everything a widget displays
 * (including Hebrew day labels) is computed here so the widget component itself
 * stays a dumb, self-contained view (see the babel `'widget'` serialization note
 * in the widget files).
 *
 * These functions are pure over `(collections, now)` — no store/`Date.now()` reads —
 * so they're unit-testable in isolation.
 */

import type { WidgetTimelineEntry } from 'expo-widgets';

import { DEGREE_CREDITS_TARGET } from '@/data/constants';
import { getExemptCredits } from '@/data/profile';
import { getCurrentSemester } from '@/data/semester';
import { degreeStats, gpaStats, upcomingAssignmentsSorted, upcomingExamsSorted } from '@/data/stats';
import type { Assignment, Course, Exam } from '@/data/types';

/** How many future midnights to pre-schedule so "days left" flips without the app running. */
const TIMELINE_DAYS = 14;
/** Rows shown on the medium Deadlines widget (small shows the first only). */
const DEADLINE_ITEMS = 3;

// ---------------------------------------------------------------------------
// Prop shapes (must be JSON round-trippable — they cross the app→widget boundary)
// ---------------------------------------------------------------------------

export interface DeadlineItem {
  name: string;
  courseName: string;
  /** Calendar days until the due date; negative when overdue, null when no due date. */
  daysLeft: number | null;
  /** Pre-rendered Hebrew label ("מחר", "בעוד 5 ימים", …). */
  daysLabel: string;
}

export interface DeadlinesProps {
  items: DeadlineItem[];
}

export type ExamProps =
  | { empty: true }
  | { empty?: false; title: string; courseName: string; daysLeft: number; daysLabel: string };

export interface ProgressProps {
  /** 0..1, for a gauge/bar if used. */
  degreePct: number;
  degreePctLabel: string;
  /** Credits earned toward the degree — passed courses plus recognition for prior
   * studies (`completedCredits`), matching the dashboard's `x/y נק״ז`. */
  passedCredits: number;
  /** The degree requirement (`DEGREE_CREDITS_TARGET`) — the same denominator
   * `degreePct` uses, so the ring and the `x/y נק״ז` label always agree. */
  totalCredits: number;
  creditsLabel: string;
  gpa: number;
  gpaLabel: string;
}

// ---------------------------------------------------------------------------
// Date helpers (calendar-day math, DST-safe via the local Date constructor)
// ---------------------------------------------------------------------------

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days from `now` until an ISO `YYYY-MM-DD` date (0 = today, 1 = tomorrow). */
function daysUntil(isoDate: string, now: Date): number {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const target = new Date(year, month - 1, day).getTime();
  return Math.round((target - startOfDay(now)) / 86_400_000);
}

/** `now`, then each of the next `count` local midnights — the WidgetKit timeline dates. */
function upcomingMidnights(now: Date, count: number): Date[] {
  const dates: Date[] = [now];
  for (let i = 1; i <= count; i += 1) {
    dates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  }
  return dates;
}

function daysLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return 'באיחור';
  if (daysLeft === 0) return 'היום';
  if (daysLeft === 1) return 'מחר';
  return `בעוד ${daysLeft} ימים`;
}

function courseNames(courses: Course[]): Map<string, string> {
  const byId = new Map<string, string>();
  for (const course of courses) byId.set(course.id, course.name);
  return byId;
}

// ---------------------------------------------------------------------------
// Timeline builders — one entry per upcoming midnight, each with recomputed labels
// ---------------------------------------------------------------------------

export function buildDeadlinesTimeline(
  courses: Course[],
  assignments: Assignment[],
  now: Date = new Date(),
): WidgetTimelineEntry<DeadlinesProps>[] {
  const names = courseNames(courses);
  const open = upcomingAssignmentsSorted(assignments, DEADLINE_ITEMS);
  return upcomingMidnights(now, TIMELINE_DAYS).map((date) => ({
    date,
    props: {
      items: open.map((assignment) => {
        const daysLeft = assignment.dueDate ? daysUntil(assignment.dueDate, date) : null;
        return {
          name: assignment.name,
          courseName: names.get(assignment.courseId) ?? '',
          daysLeft,
          daysLabel: daysLabel(daysLeft),
        };
      }),
    },
  }));
}

export function buildExamTimeline(
  courses: Course[],
  exams: Exam[],
  now: Date = new Date(),
): WidgetTimelineEntry<ExamProps>[] {
  const names = courseNames(courses);
  const next = upcomingExamsSorted(exams)[0];
  return upcomingMidnights(now, TIMELINE_DAYS).map((date) => {
    if (!next) return { date, props: { empty: true } };
    const daysLeft = daysUntil(next.date, date);
    return {
      date,
      props: {
        title: next.title,
        courseName: names.get(next.courseId) ?? '',
        daysLeft,
        daysLabel: daysLabel(daysLeft),
      },
    };
  });
}

export function buildProgressTimeline(
  courses: Course[],
  exams: Exam[],
  now: Date = new Date(),
): WidgetTimelineEntry<ProgressProps>[] {
  // Degree % and GPA are grade-derived, not date-derived, so a single snapshot suffices.
  const degree = degreeStats(courses, getCurrentSemester(now), getExemptCredits());
  const gpa = gpaStats(exams, courses);
  return [
    {
      date: now,
      props: {
        degreePct: degree.degreePct,
        degreePctLabel: `${Math.round(degree.degreePct * 100)}%`,
        passedCredits: degree.completedCredits,
        totalCredits: DEGREE_CREDITS_TARGET,
        creditsLabel: `${degree.completedCredits}/${DEGREE_CREDITS_TARGET}`,
        gpa: gpa.gpa,
        gpaLabel: gpa.count > 0 ? gpa.gpa.toFixed(1) : '—',
      },
    },
  ];
}
