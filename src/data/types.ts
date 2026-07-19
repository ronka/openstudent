/**
 * Data model for OpenStudent, ported from the Notion "תואר במדעי המחשב 2023" template.
 * See PLAN.md §2 for the source field mapping.
 */

/** Widened from a 2-value union to the raw scraped subject/department name so the
 * full catalog (all Open University departments, not just CS/Math) can be represented. */
export type Faculty = string;
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
}

/** Exams (רשימת מבחנים) — exam dates and grades. §2.3 */
export interface Exam {
  id: string;
  title: string;
  courseId: string;
  date: string;
  grade?: number;
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
