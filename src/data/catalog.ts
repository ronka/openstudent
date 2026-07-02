import { seedCourses } from './seed';
import type { Course, CourseLevel, CourseType, Faculty } from './types';

/**
 * Static course catalog — today's 25 seed courses, stripped of per-enrollment fields
 * (status/year/semester/grade/notes). Derived from `seed.ts` so there is one source of
 * truth for course identity; adding a course means picking from here, not typing.
 */
export interface CourseCatalogEntry {
  courseNumber: string;
  name: string;
  faculty?: Faculty;
  credits?: number;
  type: CourseType;
  level?: CourseLevel;
}

export const COURSE_CATALOG: CourseCatalogEntry[] = seedCourses
  .filter((course): course is Course & { courseNumber: string } => course.courseNumber !== undefined)
  .map((course) => ({
    courseNumber: course.courseNumber,
    name: course.name,
    faculty: course.faculty,
    credits: course.credits,
    type: course.type,
    level: course.level,
  }));

export function catalogEntryByNumber(courseNumber: string): CourseCatalogEntry | undefined {
  return COURSE_CATALOG.find((entry) => entry.courseNumber === courseNumber);
}

export function isEnrolled(courseNumber: string, courses: Course[]): boolean {
  return courses.some((course) => course.courseNumber === courseNumber);
}
