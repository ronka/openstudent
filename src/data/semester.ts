import type { Course, CourseStatus, Semester } from './types';

type SemesterFields = Pick<Course, 'year' | 'semester' | 'grade' | 'statusOverride' | 'binaryPass'>;

/**
 * Open University semester calendar (confirmed with the user):
 *   א (Autumn) — Nov–Feb
 *   ב (Spring) — Mar–Jun
 *   ג (Summer) — Jul–Oct
 * The academic `year` is the calendar year the term starts in — matches how
 * `seed.ts` already labels `year` (e.g. Nov 2026–Feb 2027 is `{ year: 2026, term: 'א' }`).
 */

export interface CurrentSemester {
  year: number;
  term: Semester;
}

export function getCurrentSemester(now: Date = new Date()): CurrentSemester {
  const month = now.getMonth() + 1; // 1-12
  const calendarYear = now.getFullYear();

  if (month >= 11) return { year: calendarYear, term: 'א' };
  if (month <= 2) return { year: calendarYear - 1, term: 'א' };
  if (month <= 6) return { year: calendarYear, term: 'ב' };
  return { year: calendarYear, term: 'ג' };
}

/** Selectable academic years for pickers: back to 2020, plus three years ahead of now. */
export function getYearOptions(now: Date = new Date()): number[] {
  const base = getCurrentSemester(now).year;
  const startYear = Math.min(2020, base - 2);
  const length = base + 3 - startYear + 1;
  return Array.from({ length }, (_, index) => startYear + index);
}

export function isCurrentSemester(course: SemesterFields, current: CurrentSemester): boolean {
  return course.year === current.year && course.semester === current.term;
}

export function deriveCourseStatus(course: SemesterFields, current: CurrentSemester): CourseStatus {
  // A manual override, once set, wins over auto-derivation — every read site
  // (courses list, detail, plan, stats) goes through here, so they all honor it.
  if (course.statusOverride) return course.statusOverride;
  // "עובר בינארי" is a passing outcome by definition, and it usually has no numeric
  // grade to derive from — so it must imply `passed` or the credits would go missing
  // from degree progress. A manual override (e.g. נכשל) still wins, above.
  if (course.binaryPass) return 'passed';
  if (course.grade !== undefined) return 'passed';
  if (isCurrentSemester(course, current)) return 'studying';
  return 'planned';
}
