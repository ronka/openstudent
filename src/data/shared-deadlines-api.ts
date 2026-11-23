import { posthog } from '@/utils/analytics';
import { apiUrl } from '@/utils/api-origin';
import { apiWriteHeaders } from '@/utils/api-write-headers';

import { getItemSync, setItemSync } from './kv-storage';
import {
  deadlineItemKey,
  findShared,
  isDueDateInSemester,
  parseSharedDeadlines,
  resolveCourseSemester,
  type DeadlineKey,
  type SharedDeadline,
} from './shared-deadlines';
import type { Assignment, AssignmentType, Course } from './types';

/**
 * App-side client for `/api/shared-deadlines`. Every function here is best-effort: it
 * resolves (never rejects) and treats timeouts, non-2xx responses, HTML from a not-yet-
 * deployed route and malformed JSON all the same — "no shared data". Local assignment
 * saves must never depend on, or wait for, anything in this file.
 */

const REQUEST_TIMEOUT_MS = 8000;
const INSTALL_ID_KEY = 'sharedDeadlines.installId';
const VOTES_KEY = 'sharedDeadlines.votes';

function randomToken(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Random id generated on first use and kept on-device only; the server stores a hash. */
function getInstallId(): string {
  const existing = getItemSync(INSTALL_ID_KEY);
  if (existing) return existing;
  const created = randomToken();
  setItemSync(INSTALL_ID_KEY, created);
  return created;
}

/** What this install last voted for, by item key — so edits re-send a changed vote. */
function loadVotes(): Record<string, string> {
  try {
    return JSON.parse(getItemSync(VOTES_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function getMyVote(key: DeadlineKey, type: AssignmentType, taskNumber: number): string | undefined {
  return loadVotes()[deadlineItemKey(key, type, taskNumber)];
}

function rememberVote(key: DeadlineKey, type: AssignmentType, taskNumber: number, dueDate: string) {
  setItemSync(VOTES_KEY, JSON.stringify({ ...loadVotes(), [deadlineItemKey(key, type, taskNumber)]: dueDate }));
}

async function request(path: string, init?: RequestInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl(path), { ...init, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Shared deadlines for a course · year · semester; `[]` on any failure. */
export async function fetchSharedDeadlines({ courseNumber, year, semester }: DeadlineKey): Promise<SharedDeadline[]> {
  const params = new URLSearchParams({ course: courseNumber, year: String(year), semester });
  return parseSharedDeadlines(await request(`/api/shared-deadlines?${params.toString()}`));
}

/** Casts or changes this install's vote. Returns whether the server accepted it. */
export async function submitDeadlineVote(
  key: DeadlineKey,
  type: AssignmentType,
  taskNumber: number,
  dueDate: string
): Promise<boolean> {
  const result = await request('/api/shared-deadlines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...apiWriteHeaders() },
    body: JSON.stringify({ ...key, type, taskNumber, dueDate, installId: getInstallId() }),
  });
  if (!result) return false;
  rememberVote(key, type, taskNumber, dueDate);
  return true;
}

/** Analytics props shared by every shared-deadline event. No ids, no personal data. */
export function deadlineEventProps(key: DeadlineKey) {
  return { course_number: key.courseNumber, year: key.year, semester: key.semester };
}

/** The shared-deadline key for a course, or undefined if it has no catalog number. */
export function courseDeadlineKey(course: Pick<Course, 'courseNumber' | 'year' | 'semester'>): DeadlineKey | undefined {
  if (!course.courseNumber) return undefined;
  return { courseNumber: course.courseNumber, ...resolveCourseSemester(course) };
}

/** User explicitly confirms the winning date, or corrects it by sending their own. */
export async function confirmDeadline(
  key: DeadlineKey,
  type: AssignmentType,
  taskNumber: number,
  dueDate: string,
  kind: 'confirm' | 'correct'
): Promise<boolean> {
  const ok = await submitDeadlineVote(key, type, taskNumber, dueDate);
  if (ok) posthog.capture('shared_deadline_confirmed', { ...deadlineEventProps(key), type, kind });
  return ok;
}

/**
 * Contributes a student-entered due date. Sends it when this install already voted on the
 * item with a different date (an edit), or when nobody has shared this item yet — never
 * to pile onto an existing shared date (that is `confirmDeadline`'s explicit action).
 * Fire-and-forget: call with `void`, it cannot throw.
 */
export async function contributeAssignmentDeadline(
  course: Pick<Course, 'courseNumber' | 'year' | 'semester'>,
  assignment: Pick<Assignment, 'type' | 'taskNumber' | 'dueDate'>
): Promise<void> {
  try {
    const key = courseDeadlineKey(course);
    const dueDate = assignment.dueDate;
    if (!key || !dueDate || !isDueDateInSemester(dueDate, key.year, key.semester)) return;

    const previous = getMyVote(key, assignment.type, assignment.taskNumber);
    if (previous === dueDate) return;
    if (previous === undefined) {
      const shared = await fetchSharedDeadlines(key);
      if (findShared(shared, assignment.type, assignment.taskNumber)) return;
    }
    const ok = await submitDeadlineVote(key, assignment.type, assignment.taskNumber, dueDate);
    if (ok) {
      posthog.capture('shared_deadline_contributed', {
        ...deadlineEventProps(key),
        type: assignment.type,
        is_edit: previous !== undefined,
      });
    }
  } catch {
    // Contributions are best-effort by design.
  }
}
