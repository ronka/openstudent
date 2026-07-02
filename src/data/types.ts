/**
 * Data model for OpenStudent, ported from the Notion "תואר במדעי המחשב 2023" template.
 * See PLAN.md §2 for the source field mapping.
 */

export type Faculty = 'מתמטיקה' | 'מדעי המחשב';
export type CourseType = 'חובה' | 'בחירה' | 'סמינר';
export type CourseLevel = 'ר' | 'מ';
export type CourseStatus = 'planned' | 'studying' | 'passed';
export type Semester = 'א' | 'ב' | 'ג';
export type AssignmentStatus = 'todo' | 'done';
export type AssignmentType = 'MAMAN' | 'MAMACH';

/** Courses (רשימת קורסים) — the central catalog. §2.1 */
export interface Course {
  id: string;
  name: string;
  courseNumber?: string;
  faculty?: Faculty;
  credits?: number;
  type: CourseType;
  level?: CourseLevel;
  status: CourseStatus;
  year?: number;
  semester?: Semester;
  grade?: number;
  notes?: string;
}

/**
 * Assignments (מטלות) — every task is a ממ״נ (MAMAN, 11–19) or ממ״ח (MAMACH, 21–29)
 * tied to a course. `name` is auto-generated from `type` + `taskNumber` (e.g. `ממ״נ 11`).
 */
export interface Assignment {
  id: string;
  name: string;
  courseId: string;
  type: AssignmentType;
  taskNumber: number;
  status: AssignmentStatus;
  dueDate?: string;
  materialIds: string[];
}

/** Exams (רשימת מבחנים) — exam dates and grades. §2.3 */
export interface Exam {
  id: string;
  title: string;
  courseId: string;
  date: string;
  grade?: number;
}

/** Recordings (מעקב הקלטות) — last watched lecture per course. §2.4 */
export interface Recording {
  id: string;
  name: string;
  recordingNumber: number;
  courseId: string;
}

/** Materials (חומרים) — study resources. §2.5. `courseId` is undefined for unfiled inbox items. */
export interface Material {
  id: string;
  name: string;
  courseId?: string;
  assignmentIds: string[];
  tags: string[];
  createdAt: string;
}

/**
 * Study Plan (תוכנית לימודים) — not a table. §2.6 says this is a grouped view over
 * `courses`, by `year` then `semester`, covering every status. Represented here only as
 * the shape of that grouping, not as a stored entity.
 */
export interface StudyPlanGroup {
  year: number;
  semester: Semester;
  courses: Course[];
}
