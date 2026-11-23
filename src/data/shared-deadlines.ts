import { ASSIGNMENT_NUMBER_RANGE, getAssignmentName } from './constants';
import { getCurrentSemester, getSemesterRange } from './semester';
import type { Assignment, AssignmentType, Course, Semester } from './types';

/**
 * Student-contributed ממ״ן / ממ״ח deadlines, shared per course · academic year · semester.
 *
 * Everything here is pure (no React Native, no database) so the same rules run in the
 * API route and the app, and can be unit-tested. The transport lives in
 * `shared-deadlines-api.ts` (client) and `shared-deadlines-server.ts` (server).
 */

const SEMESTER_TERMS: Semester[] = ['א', 'ב', 'ג'];
const TYPES: AssignmentType[] = ['MAMAN', 'MAMACH'];

/** A due date may fall this many days before the semester start or after its end. */
export const SEMESTER_WINDOW_DAYS = 30;
/** Academic years accepted: 2020 up to this many years past the current one. */
export const YEARS_AHEAD = 3;
const MIN_YEAR = 2020;

/** A shared deadline as served to the app: the winning date plus how many agree. */
export interface SharedDeadline {
  type: AssignmentType;
  taskNumber: number;
  dueDate: string;
  /** Installs whose current vote is `dueDate`. */
  confirmations: number;
  /** Other dates students proposed, most-confirmed first. */
  alternatives: { dueDate: string; confirmations: number }[];
}

/** A single install's current vote for one item. One install has at most one per item. */
export interface DeadlineVote {
  type: AssignmentType;
  taskNumber: number;
  dueDate: string;
  /** Opaque per-install identifier (the server only ever holds a hash of it). */
  voterId: string;
  /** Epoch ms of the vote's last change. */
  updatedAt: number;
}

export interface DeadlineKey {
  courseNumber: string;
  year: number;
  semester: Semester;
}

export interface DeadlineVoteInput extends DeadlineKey {
  type: AssignmentType;
  taskNumber: number;
  dueDate: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

// --- validation --------------------------------------------------------------------

/** Catalog course numbers are 4–5 digits (e.g. `4101`, `20441`). */
export function isValidCourseNumber(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4,5}$/.test(value);
}

export function isAssignmentType(value: unknown): value is AssignmentType {
  return value === 'MAMAN' || value === 'MAMACH';
}

/** True when `taskNumber` is within the type's range (ממ״נ 11–19, ממ״ח 21–29). */
export function isValidTaskNumber(type: AssignmentType, taskNumber: unknown): taskNumber is number {
  if (typeof taskNumber !== 'number' || !Number.isInteger(taskNumber)) return false;
  const [min, max] = ASSIGNMENT_NUMBER_RANGE[type];
  return taskNumber >= min && taskNumber <= max;
}

/** `'YYYY-MM-DD'` that is a real calendar day (rejects `2027-02-30`). */
export function isRealDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Inclusive window a due date must fall in: the semester ± `SEMESTER_WINDOW_DAYS`. */
export function getDueDateWindow(year: number, semester: Semester): { min: string; max: string } {
  const { start, end } = getSemesterRange(year, semester);
  return { min: shiftDays(start, -SEMESTER_WINDOW_DAYS), max: shiftDays(end, SEMESTER_WINDOW_DAYS) };
}

export function isDueDateInSemester(dueDate: string, year: number, semester: Semester): boolean {
  if (!isRealDate(dueDate)) return false;
  const { min, max } = getDueDateWindow(year, semester);
  // ISO dates compare correctly as strings.
  return dueDate >= min && dueDate <= max;
}

export function isValidAcademicYear(year: unknown, now: Date = new Date()): year is number {
  return (
    typeof year === 'number' &&
    Number.isInteger(year) &&
    year >= MIN_YEAR &&
    year <= getCurrentSemester(now).year + YEARS_AHEAD
  );
}

type ValidateOptions = { now?: Date; isKnownCourse?: (courseNumber: string) => boolean };

/** Validates the course · year · semester key (used by both reads and writes). */
export function validateDeadlineKey(
  input: unknown,
  { now = new Date(), isKnownCourse = () => true }: ValidateOptions = {}
): ValidationResult<DeadlineKey> {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Invalid request body' };
  const { courseNumber, year, semester } = input as Record<string, unknown>;
  if (!isValidCourseNumber(courseNumber) || !isKnownCourse(courseNumber)) {
    return { ok: false, error: 'courseNumber is not a known course' };
  }
  if (!isValidAcademicYear(year, now)) return { ok: false, error: 'year is out of range' };
  if (typeof semester !== 'string' || !SEMESTER_TERMS.includes(semester as Semester)) {
    return { ok: false, error: 'semester must be one of א, ב, ג' };
  }
  return { ok: true, value: { courseNumber, year, semester: semester as Semester } };
}

/** Validates a write body. `isKnownCourse` lets the server also check the catalog. */
export function validateDeadlineVote(input: unknown, options: ValidateOptions = {}): ValidationResult<DeadlineVoteInput> {
  const key = validateDeadlineKey(input, options);
  if (!key.ok) return key;
  const { type, taskNumber, dueDate } = input as Record<string, unknown>;
  if (!isAssignmentType(type)) return { ok: false, error: 'type must be MAMAN or MAMACH' };
  if (!isValidTaskNumber(type, taskNumber)) {
    const [min, max] = ASSIGNMENT_NUMBER_RANGE[type];
    return { ok: false, error: `taskNumber must be an integer from ${min} to ${max} for ${type}` };
  }
  if (!isRealDate(dueDate)) return { ok: false, error: 'dueDate must be a real YYYY-MM-DD date' };
  if (!isDueDateInSemester(dueDate, key.value.year, key.value.semester)) {
    return { ok: false, error: 'dueDate is outside the semester' };
  }
  return { ok: true, value: { ...key.value, type, taskNumber, dueDate } };
}

/** Anonymous install ids are random tokens; reject anything that is not token-shaped. */
export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(value);
}

// --- vote tally --------------------------------------------------------------------

/**
 * Turns raw votes into one `SharedDeadline` per (type, number).
 *
 * - One vote per install per item: if an install appears more than once (it changed its
 *   mind) only its most recent vote counts, so a correction never double-counts.
 * - Winner = the date with the most confirmations. **Tie-break: the earliest date** —
 *   deterministic without timestamps, and the safe error for a student (an early
 *   reminder beats a missed deadline).
 * - Output is ordered ממ״נ before ממ״ח, then by number.
 */
export function buildSharedDeadlines(votes: DeadlineVote[]): SharedDeadline[] {
  const latestByVoter = new Map<string, DeadlineVote>();
  for (const vote of votes) {
    const key = `${vote.type}:${vote.taskNumber}:${vote.voterId}`;
    const existing = latestByVoter.get(key);
    if (!existing || vote.updatedAt >= existing.updatedAt) latestByVoter.set(key, vote);
  }

  const counts = new Map<string, { type: AssignmentType; taskNumber: number; dates: Map<string, number> }>();
  for (const vote of latestByVoter.values()) {
    const itemKey = `${vote.type}:${vote.taskNumber}`;
    const item = counts.get(itemKey) ?? { type: vote.type, taskNumber: vote.taskNumber, dates: new Map() };
    item.dates.set(vote.dueDate, (item.dates.get(vote.dueDate) ?? 0) + 1);
    counts.set(itemKey, item);
  }

  const result: SharedDeadline[] = [];
  for (const item of counts.values()) {
    const ranked = [...item.dates.entries()]
      .map(([dueDate, confirmations]) => ({ dueDate, confirmations }))
      .sort((a, b) => b.confirmations - a.confirmations || a.dueDate.localeCompare(b.dueDate));
    const [winner, ...alternatives] = ranked;
    result.push({ type: item.type, taskNumber: item.taskNumber, ...winner, alternatives });
  }
  return result.sort(compareDeadlines);
}

function compareDeadlines(a: { type: AssignmentType; taskNumber: number }, b: { type: AssignmentType; taskNumber: number }) {
  return TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || a.taskNumber - b.taskNumber;
}

// --- merging with local data -------------------------------------------------------

/**
 * The shared deadlines worth offering: those whose type + number the student does not
 * already have locally. Local assignments are never overwritten — even one without a date.
 */
export function mergeWithLocal(
  shared: SharedDeadline[],
  local: { type: AssignmentType; taskNumber: number }[]
): SharedDeadline[] {
  const have = new Set(local.map((item) => `${item.type}:${item.taskNumber}`));
  return shared.filter((item) => !have.has(`${item.type}:${item.taskNumber}`));
}

/** Ordinary local assignments (so reminders pick them up) from accepted shared deadlines. */
export function buildAssignmentsFromShared(courseId: string, items: SharedDeadline[], now: number = Date.now()): Assignment[] {
  return items.map((item, index) => ({
    id: `${courseId}-${item.type}-${item.taskNumber}-${now}-${index}`,
    name: getAssignmentName(item.type, item.taskNumber),
    courseId,
    type: item.type,
    taskNumber: item.taskNumber,
    status: 'todo',
    dueDate: item.dueDate,
  }));
}

export function findShared(
  shared: SharedDeadline[],
  type: AssignmentType,
  taskNumber: number
): SharedDeadline | undefined {
  return shared.find((item) => item.type === type && item.taskNumber === taskNumber);
}

// --- keys & parsing ----------------------------------------------------------------

/** The semester a course belongs to: its own year + semester, else the current semester. */
export function resolveCourseSemester(
  course: Pick<Course, 'year' | 'semester'>,
  now: Date = new Date()
): { year: number; semester: Semester } {
  if (course.year !== undefined && course.semester) return { year: course.year, semester: course.semester };
  const current = getCurrentSemester(now);
  return { year: course.year ?? current.year, semester: course.semester ?? current.term };
}

/** Stable local key for an item, e.g. to remember which items this install voted on. */
export function deadlineItemKey(
  { courseNumber, year, semester }: DeadlineKey,
  type: AssignmentType,
  taskNumber: number
): string {
  return `${courseNumber}|${year}|${semester}|${type}|${taskNumber}`;
}

/** Defensive parse of the GET response: anything malformed is dropped, never thrown. */
export function parseSharedDeadlines(json: unknown): SharedDeadline[] {
  if (!json || typeof json !== 'object') return [];
  const raw = (json as { deadlines?: unknown }).deadlines;
  if (!Array.isArray(raw)) return [];
  const result: SharedDeadline[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { type, taskNumber, dueDate, confirmations, alternatives } = entry as Record<string, unknown>;
    if (!isAssignmentType(type) || !isValidTaskNumber(type, taskNumber) || !isRealDate(dueDate)) continue;
    result.push({
      type,
      taskNumber,
      dueDate,
      confirmations: typeof confirmations === 'number' && confirmations > 0 ? Math.floor(confirmations) : 1,
      alternatives: Array.isArray(alternatives)
        ? alternatives.flatMap((alt) => {
            const a = alt as { dueDate?: unknown; confirmations?: unknown };
            return isRealDate(a?.dueDate) && typeof a.confirmations === 'number'
              ? [{ dueDate: a.dueDate, confirmations: a.confirmations }]
              : [];
          })
        : [],
    });
  }
  return result.sort(compareDeadlines);
}
