import type { Course, Semester } from './types';

export interface DegreeGrade {
  courseId: string;
  title: string;
  grade: number;
}

export interface DegreeAverage {
  average: number;
  min: number;
  max: number;
  count: number;
  grades: DegreeGrade[];
}

const SEMESTER_ORDER: Record<Semester, number> = { 'א': 0, 'ב': 1, 'ג': 2 };

/**
 * Calculate the degree average shown by the app from final course grades.
 *
 * Course credits determine the weight. Binary-pass courses do not participate. A
 * missing credit value falls back to one so imported or legacy courses with a final
 * grade are not silently discarded.
 */
export function calculateDegreeAverage(courses: Course[]): DegreeAverage {
  const gradedCourses = courses
    .filter(
      (course): course is Course & { grade: number } =>
        course.grade !== undefined && !course.binaryPass
    )
    .sort((a, b) => {
      const yearDifference = (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER);
      if (yearDifference !== 0) return yearDifference;
      return (
        (a.semester ? SEMESTER_ORDER[a.semester] : Number.MAX_SAFE_INTEGER) -
        (b.semester ? SEMESTER_ORDER[b.semester] : Number.MAX_SAFE_INTEGER)
      );
    });

  let weightedSum = 0;
  let totalWeight = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const course of gradedCourses) {
    const weight = course.credits ?? 1;
    weightedSum += course.grade * weight;
    totalWeight += weight;
    min = Math.min(min, course.grade);
    max = Math.max(max, course.grade);
  }

  return {
    average: totalWeight > 0 ? weightedSum / totalWeight : 0,
    min: gradedCourses.length > 0 ? min : 0,
    max: gradedCourses.length > 0 ? max : 0,
    count: gradedCourses.length,
    grades: gradedCourses.map((course) => ({
      courseId: course.id,
      title: course.name,
      grade: course.grade,
    })),
  };
}
