import type { AssignmentStatus, CourseLevel, CourseStatus, CourseType, Faculty, Semester } from './types';

export const COURSE_STATUSES: CourseStatus[] = ['planned', 'studying', 'passed'];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planned: 'מתוכנן',
  studying: 'בלימוד',
  passed: 'עובר',
};

export const COURSE_STATUS_TONES: Record<CourseStatus, 'neutral' | 'info' | 'success'> = {
  planned: 'neutral',
  studying: 'info',
  passed: 'success',
};

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['todo', 'in_progress', 'done'];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  todo: 'לעשות',
  in_progress: 'בתהליך',
  done: 'נגמר',
};

export const ASSIGNMENT_STATUS_TONES: Record<AssignmentStatus, 'neutral' | 'info' | 'success'> = {
  todo: 'neutral',
  in_progress: 'info',
  done: 'success',
};

export const COURSE_TYPES: CourseType[] = ['חובה', 'בחירה', 'סמינר'];

export const COURSE_LEVELS: CourseLevel[] = ['ר', 'מ'];

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  ר: 'רגיל',
  מ: 'מתקדם',
};

export const FACULTIES: Faculty[] = ['מתמטיקה', 'מדעי המחשב'];

export const SEMESTERS: Semester[] = ['א', 'ב', 'ג'];
