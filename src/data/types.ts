/**
 * Data model for OpenStudent, ported from the Notion "תואר במדעי המחשב 2023" template.
 * See PLAN.md §2 for the source field mapping.
 */

/** Widened from a 2-value union to the raw scraped subject/department name so the
 * full catalog (all Open University departments, not just CS/Math) can be represented. */
export type Faculty = string;
export type CourseType = 'חובה' | 'בחירה' | 'סמינר';
export type CourseLevel = 'ר' | 'מ';
/**
 * `failed`/`abandoned` are terminal, non-passing outcomes (didn't pass the exam,
 * or dropped mid-way). They're never auto-derived — only set manually via the status
 * badge — and are excluded from degree-progress math (see `degreeStats`).
 */
export type CourseStatus = 'planned' | 'studying' | 'passed' | 'failed' | 'abandoned';
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
  /** Manual status override. When set, it wins over the derived status (see
   * `deriveCourseStatus`); when undefined, status falls back to auto-derivation
   * from `year`/`semester`/`grade`. Cleared by picking "אוטומטי". */
  statusOverride?: CourseStatus;
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
