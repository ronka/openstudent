import type { Assignment, Course, Exam, Material, Recording } from './types';

/**
 * In-memory seed data ported from the Notion export ("תואר במדעי המחשב 2023").
 * See PLAN.md §4. This is the only place raw seed values live — everything else
 * should read through `src/data/store.ts`.
 */

export const seedCourses: Course[] = [
  { id: 'c1', name: 'מתמטיקה בדידה', courseNumber: '20476', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'ג', grade: 85 },
  { id: 'c2', name: 'סמינר בהנדסת תוכנה', courseNumber: '20368', faculty: 'מדעי המחשב', credits: 3, type: 'סמינר', status: 'planned', year: 2022, semester: 'ג' },
  { id: 'c3', name: 'תכנות מתקדם בשפת Java', courseNumber: '20554', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'מ', status: 'planned', year: 2022, semester: 'ב' },
  { id: 'c4', name: 'מערכות הפעלה', courseNumber: '20594', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'מ', status: 'planned', year: 2021, semester: 'ב', notes: 'לא לשמור לסוף התואר' },
  { id: 'c5', name: 'עקרונות פיתוח מערכות מידע', courseNumber: '20436', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'ר', status: 'planned', year: 2021, semester: 'ב' },
  { id: 'c6', name: 'מבוא לתורת החישוביות והסיבוכיות', courseNumber: '20585', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'מ', status: 'planned', year: 2021, semester: 'א', notes: 'לעשות אחרי אוטומטים' },
  { id: 'c7', name: 'שפת פרולוג והיבטים לבינה מלאכותית', courseNumber: '20596', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'מ', status: 'planned', year: 2021, semester: 'א' },
  { id: 'c8', name: 'עיבוד תמונה', courseNumber: '22913', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', status: 'planned', year: 2021, semester: 'א', notes: 'קורס תואר שני' },
  { id: 'c9', name: 'אלגוריתמים', courseNumber: '20417', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'ר', status: 'planned', year: 2020, semester: 'ג', notes: 'קורס קשה, לשקול לעשות בסמסטר ניפרד' },
  { id: 'c10', name: 'מבוא לרשתות תקשורת מחשבים', courseNumber: '20582', faculty: 'מדעי המחשב', credits: 6, type: 'בחירה', level: 'מ', status: 'planned', year: 2020, semester: 'ב', notes: 'לעשות אותו כי הוא הרבה נקז' },
  { id: 'c11', name: 'סדנה במדעי הנתונים', courseNumber: '20936', faculty: 'מדעי המחשב', credits: 4, type: 'סמינר', level: 'מ', status: 'planned', year: 2020, semester: 'ב' },
  { id: 'c12', name: 'אוטומטים ושפות פורמליות', courseNumber: '20440', faculty: 'מדעי המחשב', credits: 4, type: 'חובה', level: 'ר', status: 'studying', year: 2020, semester: 'א', notes: 'לעשות לפני אלגוריתמים' },
  { id: 'c13', name: 'לוגיקה למדעי המחשב', courseNumber: '20466', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר', status: 'studying', year: 2020, semester: 'א' },
  { id: 'c14', name: 'הסתברות לתלמידי מדעי המחשב', courseNumber: '20425', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'ג', grade: 87 },
  { id: 'c15', name: 'מערכות בסיסי-נתונים', courseNumber: '20277', faculty: 'מדעי המחשב', credits: 4, type: 'בחירה', level: 'ר', status: 'passed', year: 2019, semester: 'ב', grade: 90, notes: "לשקול לקחת בקיץ 2019ג'" },
  { id: 'c16', name: 'ארגון המחשב', courseNumber: '20471', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'ב', grade: 88 },
  { id: 'c17', name: 'מערכות ספרתיות', courseNumber: '20272', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'ב', grade: 87, notes: 'לעשות לפני לוגיקה ואוטומטים' },
  { id: 'c18', name: 'מעבדה בתכנות מערכות', courseNumber: '20465', faculty: 'מדעי המחשב', credits: 3, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'ב', grade: 99 },
  { id: 'c19', name: 'חשבון אינפיניטסימלי 2', courseNumber: '20475', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר', status: 'passed', year: 2019, semester: 'א', grade: 76 },
  { id: 'c20', name: 'אשנב למתמטיקה', courseNumber: '4101', faculty: 'מתמטיקה', credits: 6, type: 'בחירה', status: 'passed', year: 2018, semester: 'א', grade: 75 },
  { id: 'c21', name: 'חשבון אינפיניטסימלי 1', courseNumber: '20474', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר', status: 'passed', year: 2018, semester: 'ב', grade: 86 },
  { id: 'c22', name: 'מבני נתונים ומבוא לאלגוריתמים', courseNumber: '20407', faculty: 'מדעי המחשב', credits: 6, type: 'חובה', level: 'ר', status: 'passed', year: 2018, semester: 'ב', grade: 90 },
  { id: 'c23', name: 'אלגברה לינארית 2', courseNumber: '20229', faculty: 'מתמטיקה', credits: 4, type: 'חובה', level: 'ר', status: 'passed', year: 2018, semester: 'א', grade: 66 },
  { id: 'c24', name: 'מבוא למדעי המחשב ושפת Java', courseNumber: '20441', faculty: 'מדעי המחשב', credits: 6, type: 'חובה', level: 'ר', status: 'passed', year: 2018, semester: 'א', grade: 94 },
  { id: 'c25', name: 'אלגברה לינארית 1', courseNumber: '20109', faculty: 'מתמטיקה', credits: 6, type: 'חובה', level: 'ר', status: 'passed', year: 2018, semester: 'א', grade: 69 },
];

const courseIdByName = new Map(seedCourses.map((course) => [course.name, course.id]));

function courseId(name: string): string {
  const id = courseIdByName.get(name);
  if (!id) throw new Error(`seed.ts: unknown course name "${name}"`);
  return id;
}

export const seedAssignments: Assignment[] = [
  { id: 'a1', name: 'ממן 11', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'done', dueDate: '2023-07-06', materialIds: [] },
  { id: 'a2', name: 'ממן 12', courseId: courseId('מתמטיקה בדידה'), status: 'done', dueDate: '2023-07-06', materialIds: [] },
  { id: 'a3', name: 'ממן 11', courseId: courseId('מתמטיקה בדידה'), status: 'done', dueDate: '2023-07-06', materialIds: [] },
  { id: 'a4', name: 'ממח 23', courseId: courseId('לוגיקה למדעי המחשב'), status: 'todo', dueDate: '2023-07-21', materialIds: [] },
  { id: 'a5', name: 'ממח 22', courseId: courseId('לוגיקה למדעי המחשב'), status: 'todo', dueDate: '2023-07-28', materialIds: [] },
  { id: 'a6', name: 'ממח 21', courseId: courseId('לוגיקה למדעי המחשב'), status: 'todo', dueDate: '2023-07-07', materialIds: [] },
  { id: 'a7', name: 'ממן 13', courseId: courseId('לוגיקה למדעי המחשב'), status: 'todo', dueDate: '2023-07-12', materialIds: [] },
  { id: 'a8', name: 'ממן 12', courseId: courseId('לוגיקה למדעי המחשב'), status: 'in_progress', dueDate: '2023-07-07', materialIds: ['m3'] },
  { id: 'a9', name: 'ממן 11', courseId: courseId('לוגיקה למדעי המחשב'), status: 'in_progress', dueDate: '2023-07-05', materialIds: [] },
  { id: 'a10', name: 'ממח 22', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'todo', dueDate: '2023-07-07', materialIds: [] },
  { id: 'a11', name: 'ממח 21', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'in_progress', dueDate: '2023-07-27', materialIds: ['m9'] },
  { id: 'a12', name: 'ממן 14', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'in_progress', dueDate: '2023-07-22', materialIds: ['m10'] },
  { id: 'a13', name: 'ממן 13', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'done', dueDate: '2023-07-06', materialIds: [] },
  { id: 'a14', name: 'ממן 12', courseId: courseId('אוטומטים ושפות פורמליות'), status: 'done', dueDate: '2023-07-06', materialIds: [] },
];

export const seedExams: Exam[] = [
  { id: 'e1', title: 'מתמטיקה בדידה', courseId: courseId('מתמטיקה בדידה'), date: '2023-03-25', grade: 85 },
  { id: 'e2', title: 'מבוא למדעי המחשב ושפת Java', courseId: courseId('מבוא למדעי המחשב ושפת Java'), date: '2023-03-16', grade: 94 },
  { id: 'e3', title: 'אלגברה לינארית 1', courseId: courseId('אלגברה לינארית 1'), date: '2023-03-16', grade: 69 },
  { id: 'e4', title: 'אלגברה לינארית 2', courseId: courseId('אלגברה לינארית 2'), date: '2023-04-13', grade: 66 },
  { id: 'e5', title: 'מבני נתונים ומבוא לאלגוריתמים', courseId: courseId('מבני נתונים ומבוא לאלגוריתמים'), date: '2023-04-06', grade: 90 },
  { id: 'e6', title: 'חשבון אינפיניטסימלי 1', courseId: courseId('חשבון אינפיניטסימלי 1'), date: '2023-04-14', grade: 86 },
  { id: 'e7', title: 'אשנב למתמטיקה', courseId: courseId('אשנב למתמטיקה'), date: '2023-04-28', grade: 75 },
  { id: 'e8', title: 'חשבון אינפיניטסימלי 2', courseId: courseId('חשבון אינפיניטסימלי 2'), date: '2023-04-28', grade: 76 },
  { id: 'e9', title: 'מעבדה בתכנות מערכות', courseId: courseId('מעבדה בתכנות מערכות'), date: '2023-05-18', grade: 99 },
  { id: 'e10', title: 'מערכות ספרתיות', courseId: courseId('מערכות ספרתיות'), date: '2023-05-18', grade: 87 },
  { id: 'e11', title: 'ארגון המחשב', courseId: courseId('ארגון המחשב'), date: '2023-05-19', grade: 88 },
  { id: 'e12', title: 'מערכות בסיסי-נתונים', courseId: courseId('מערכות בסיסי-נתונים'), date: '2023-06-16', grade: 90 },
  { id: 'e13', title: 'הסתברות לתלמידי מדעי המחשב', courseId: courseId('הסתברות לתלמידי מדעי המחשב'), date: '2023-06-15', grade: 87 },
  { id: 'e14', title: 'לוגיקה למדעי המחשב', courseId: courseId('לוגיקה למדעי המחשב'), date: '2023-10-01' },
  { id: 'e15', title: 'אוטומטים ושפות פורמליות', courseId: courseId('אוטומטים ושפות פורמליות'), date: '2023-12-01' },
];

export const seedRecordings: Recording[] = [
  { id: 'r1', name: 'הקלטה', recordingNumber: 3, courseId: courseId('אוטומטים ושפות פורמליות') },
  { id: 'r2', name: 'הקלטה', recordingNumber: 4, courseId: courseId('לוגיקה למדעי המחשב') },
  { id: 'r3', name: 'הקלטה', recordingNumber: 12, courseId: courseId('מתמטיקה בדידה') },
  { id: 'r4', name: 'הקלטה', recordingNumber: 7, courseId: courseId('אלגברה לינארית 1') },
];

export const seedMaterials: Material[] = [
  { id: 'm1', name: 'עוד מאמר', assignmentIds: [], tags: ['מאמר'], createdAt: '2023-07-20' },
  { id: 'm2', name: 'חומר חדש מהטלפון', assignmentIds: [], tags: [], createdAt: '2023-07-20' },
  { id: 'm3', name: 'מאמר מעניין', courseId: courseId('לוגיקה למדעי המחשב'), assignmentIds: ['a8'], tags: ['מאמר'], createdAt: '2023-07-20' },
  { id: 'm4', name: 'סירטונים מעניינים על משוואות לינאריות', courseId: courseId('אלגברה לינארית 1'), assignmentIds: [], tags: ['וידאו'], createdAt: '2023-07-20' },
  { id: 'm5', name: 'עקרונות', courseId: courseId('עקרונות פיתוח מערכות מידע'), assignmentIds: [], tags: [], createdAt: '2023-07-20' },
  { id: 'm6', name: 'אסמבלי', courseId: courseId('מערכות הפעלה'), assignmentIds: [], tags: [], createdAt: '2023-07-20' },
  { id: 'm7', name: 'חומרים', courseId: courseId('סמינר בהנדסת תוכנה'), assignmentIds: [], tags: [], createdAt: '2023-07-20' },
  { id: 'm8', name: 'אם ורק אם', courseId: courseId('לוגיקה למדעי המחשב'), assignmentIds: [], tags: ['מאמר'], createdAt: '2023-07-20' },
  { id: 'm9', name: 'שפה רגולרית', courseId: courseId('אוטומטים ושפות פורמליות'), assignmentIds: ['a11'], tags: ['מאמר'], createdAt: '2023-07-20' },
  { id: 'm10', name: 'איך כותבים שפה פורמלית', courseId: courseId('אוטומטים ושפות פורמליות'), assignmentIds: ['a12'], tags: ['מאמר'], createdAt: '2023-07-20' },
];
