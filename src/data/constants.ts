import type { AssignmentStatus, AssignmentType, CourseLevel, CourseStatus, Semester } from './types';

export const COURSE_STATUSES: CourseStatus[] = ['planned', 'studying', 'passed', 'failed', 'abandoned'];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planned: 'מתוכנן',
  studying: 'בלימוד',
  passed: 'עובר',
  failed: 'נכשל',
  abandoned: 'נזנח',
};

export const COURSE_STATUS_TONES: Record<CourseStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  planned: 'neutral',
  studying: 'info',
  passed: 'success',
  failed: 'warning',
  abandoned: 'neutral',
};

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['todo', 'done'];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  todo: 'לעשות',
  done: 'נגמר',
};

export const ASSIGNMENT_STATUS_TONES: Record<AssignmentStatus, 'neutral' | 'success'> = {
  todo: 'neutral',
  done: 'success',
};

export const ASSIGNMENT_TYPES: AssignmentType[] = ['MAMAN', 'MAMACH'];

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  MAMAN: 'ממ״נ',
  MAMACH: 'ממ״ח',
};

/** Valid task-number range per type: ממ״נ 11–19, ממ״ח 21–29. */
export const ASSIGNMENT_NUMBER_RANGE: Record<AssignmentType, [number, number]> = {
  MAMAN: [11, 19],
  MAMACH: [21, 29],
};

/** All valid task numbers for a type, e.g. [11, 12, …, 19]. */
export function assignmentNumbers(type: AssignmentType): number[] {
  const [start, end] = ASSIGNMENT_NUMBER_RANGE[type];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/** Auto-generated task name, e.g. `ממ״נ 11`. */
export function getAssignmentName(type: AssignmentType, taskNumber: number): string {
  return `${ASSIGNMENT_TYPE_LABELS[type]} ${taskNumber}`;
}

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  ר: 'רגיל',
  מ: 'מתקדם',
};

export const SEMESTERS: Semester[] = ['א', 'ב', 'ג'];
