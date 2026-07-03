import type { Course, CourseLevel, CourseType, Faculty } from './types';

/**
 * Static course catalog — the 25 course identity rows (number, name, faculty, credits,
 * type, level), independent of any per-enrollment data. Adding a course means picking
 * from here, not typing.
 */
export interface CourseCatalogEntry {
  courseNumber: string;
  name: string;
  faculty?: Faculty;
  credits?: number;
  type: CourseType;
  level?: CourseLevel;
}

export const COURSE_CATALOG: CourseCatalogEntry[] = [
  { courseNumber: '20476', name: 'מתמטיקה בדידה', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20368', name: 'סמינר בהנדסת תוכנה', faculty: 'מדעי המחשב', credits: 3, type: 'סמינר' },
  { courseNumber: '20554', name: 'תכנות מתקדם בשפת Java', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'מ' },
  { courseNumber: '20594', name: 'מערכות הפעלה', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'מ' },
  { courseNumber: '20436', name: 'עקרונות פיתוח מערכות מידע', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'ר' },
  { courseNumber: '20585', name: 'מבוא לתורת החישוביות והסיבוכיות', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'מ' },
  { courseNumber: '20596', name: 'שפת פרולוג והיבטים לבינה מלאכותית', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'מ' },
  { courseNumber: '22913', name: 'עיבוד תמונה', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה' },
  { courseNumber: '20417', name: 'אלגוריתמים', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20582', name: 'מבוא לרשתות תקשורת מחשבים', faculty: 'מדעי המחשב', credits: 6, type: 'בחירה', level: 'מ' },
  { courseNumber: '20936', name: 'סדנה במדעי הנתונים', faculty: 'מדעי המחשב', credits: 4, type: 'סמינר', level: 'מ' },
  { courseNumber: '20440', name: 'אוטומטים ושפות פורמליות', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20466', name: 'לוגיקה למדעי המחשב', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20425', name: 'הסתברות לתלמידי מדעי המחשב', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20277', name: 'מערכות בסיסי-נתונים', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'ר' },
  { courseNumber: '20471', name: 'ארגון המחשב', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר' },
  { courseNumber: '20272', name: 'מערכות ספרתיות', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר' },
  { courseNumber: '20465', name: 'מעבדה בתכנות מערכות', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר' },
  { courseNumber: '20475', name: 'חשבון אינפיניטסימלי 2', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר' },
  { courseNumber: '4101', name: 'אשנב למתמטיקה', faculty: 'מתמטיקה', credits: 6, type: 'בחירה' },
  { courseNumber: '20474', name: 'חשבון אינפיניטסימלי 1', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר' },
  { courseNumber: '20407', name: 'מבני נתונים ומבוא לאלגוריתמים', faculty: 'מדעי המחשב', credits: 6, type: 'חובה', level: 'ר' },
  { courseNumber: '20229', name: 'אלגברה לינארית 2', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר' },
  { courseNumber: '20441', name: 'מבוא למדעי המחשב ושפת Java', faculty: 'מדעי המחשב', credits: 6, type: 'חובה', level: 'ר' },
  { courseNumber: '20109', name: 'אלגברה לינארית 1', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר' },
];

export function catalogEntryByNumber(courseNumber: string): CourseCatalogEntry | undefined {
  return COURSE_CATALOG.find((entry) => entry.courseNumber === courseNumber);
}

export function isEnrolled(courseNumber: string, courses: Course[]): boolean {
  return courses.some((course) => course.courseNumber === courseNumber);
}
