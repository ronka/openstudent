import type { Course, CourseStatus, Semester } from './types';

type SemesterFields = Pick<Course, 'year' | 'semester' | 'grade' | 'statusOverride' | 'binaryPass'>;

/**
 * Open University semester calendar. Semesters are named by academic year, the way the
 * university names them, so the autumn term takes the year it ends in:
 *   א (Autumn) — Oct 25 to Jan 31, e.g. Oct 25, 2026 to Jan 31, 2027 is 2027א
 *   (break)    — Feb 1 to Mar 6, reported as the upcoming ב (see `isBetweenSemesters`)
 *   ב (Spring) — Mar 7 to Jun 30
 *   ג (Summer) — Jul 1 to Oct 24
 * The same dates are applied every year.
 */

export interface CurrentSemester {
  year: number;
  term: Semester;
}

const AUTUMN_START_MONTH = 10;
const AUTUMN_START_DAY = 25;
const SPRING_START_MONTH = 3;
const SPRING_START_DAY = 7;

export function getCurrentSemester(now: Date = new Date()): CurrentSemester {
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const calendarYear = now.getFullYear();

  if (month > AUTUMN_START_MONTH || (month === AUTUMN_START_MONTH && day >= AUTUMN_START_DAY)) {
    return { year: calendarYear + 1, term: 'א' };
  }
  if (month === 1) return { year: calendarYear, term: 'א' };
  if (month <= 6) return { year: calendarYear, term: 'ב' };
  return { year: calendarYear, term: 'ג' };
}

/** True from Feb 1 to Mar 6, after א has ended and before ב has started. */
export function isBetweenSemesters(now: Date = new Date()): boolean {
  const month = now.getMonth() + 1;
  return month === 2 || (month === SPRING_START_MONTH && now.getDate() < SPRING_START_DAY);
}

/** Display name for a semester, e.g. `2027א`. */
export function formatSemester({ year, term }: CurrentSemester): string {
  return `${year}${term}`;
}

/** The pre-1.0.6 calendar, which named א by the year it starts in. Migration use only. */
function legacyCurrentSemester(at: Date): CurrentSemester {
  const month = at.getMonth() + 1;
  const calendarYear = at.getFullYear();
  if (month >= 11) return { year: calendarYear, term: 'א' };
  if (month <= 2) return { year: calendarYear - 1, term: 'א' };
  if (month <= 6) return { year: calendarYear, term: 'ב' };
  return { year: calendarYear, term: 'ג' };
}

/**
 * The academic-year renaming moved א one year forward, so a course saved under the old
 * "current semester" default would stop counting as current. Returns the corrected year
 * for an ungraded א course whose saved year is exactly the old default on the day it was
 * created (read from its `c-<ms>-<index>` id), or undefined when it should stay as is.
 * Anything else may be a year the student chose by hand, so it is left alone.
 */
export function migratedSemesterYear(course: Pick<Course, 'id' | 'year' | 'semester' | 'grade'>): number | undefined {
  if (course.semester !== 'א' || course.year === undefined || course.grade !== undefined) return undefined;
  const createdAt = /^c-(\d+)-\d+$/.exec(course.id)?.[1];
  if (!createdAt) return undefined;
  const legacy = legacyCurrentSemester(new Date(Number(createdAt)));
  return legacy.term === 'א' && legacy.year === course.year ? course.year + 1 : undefined;
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
