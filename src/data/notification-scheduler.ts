import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseLocalDate } from '@/utils/date';

import { getItemSync, setItemSync } from './kv-storage';
import { getNotificationsEnabled, setNotificationsEnabled } from './notification-settings';
import { assignmentsCollection, coursesCollection, examsCollection } from './store';
import type { Assignment, Exam } from './types';

/**
 * Idempotent notification reconciler (see plan §3). Rather than hooking ~10 scattered
 * write sites, we derive the *desired* set of reminders from the current collections and
 * diff it against a *persisted* map of what's actually scheduled. Every data change (and
 * app start, permission grant, toggle) re-runs the reconcile, so the schedule always
 * converges to correct — self-healing across crashes, OS purges, and revoked-then-
 * restored permission.
 */

const SCHEDULED_KEY = 'notifications.scheduled';
const CHANNEL_ID = 'reminders';

/** iOS silently drops scheduled notifications past 64 pending; stay comfortably under. */
const MAX_PENDING = 60;

type ReminderKind = 'week' | 'day';
type EntityType = 'assignment' | 'exam';

// Index signature keeps it assignable to expo-notifications' `Record<string, unknown>`
// content payload; carries entity refs for future tap-to-navigate (plan §5).
type NotificationData = {
  entityType: EntityType;
  entityId: string;
  [key: string]: unknown;
};

/** One reminder we *want* scheduled, fully resolved (content + concrete trigger time). */
export interface DesiredReminder {
  entityId: string;
  kind: ReminderKind;
  trigger: Date;
  triggerISO: string;
  content: { title: string; body: string; data: NotificationData };
}

/** Persisted record of what we actually scheduled, keyed by entity id. */
type ScheduledMap = Record<string, { id: string; kind: ReminderKind; triggerISO: string }[]>;

// --- persistence ---------------------------------------------------------------

function loadMap(): ScheduledMap {
  const raw = getItemSync(SCHEDULED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ScheduledMap;
  } catch {
    return {};
  }
}

function saveMap(map: ScheduledMap): void {
  setItemSync(SCHEDULED_KEY, JSON.stringify(map));
}

// --- content -------------------------------------------------------------------

function assignmentContent(kind: ReminderKind, assignment: Assignment, course: string | undefined) {
  const inCourse = course ? ` בקורס ${course}` : '';
  if (kind === 'week') {
    return { title: '⏰ שבוע להגשה', body: `„${assignment.name}"${inCourse} — ההגשה בעוד שבוע` };
  }
  return { title: '⏰ ההגשה מחר!', body: `„${assignment.name}"${inCourse} — ההגשה מחר` };
}

function examContent(kind: ReminderKind, exam: Exam, course: string | undefined) {
  const label = course ?? exam.title;
  if (kind === 'week') {
    return { title: '📝 שבוע לבחינה', body: `בחינה ב${label} בעוד שבוע (${exam.date})` };
  }
  return { title: '📝 הבחינה מחר!', body: `בחינה ב${label} מחר — בהצלחה!` };
}

// --- desired-set computation ---------------------------------------------------

/** 09:00 local on `dateStr` minus `daysBefore`, using the same local-noon parsing as the
 * rest of the app. The Date constructor handles month/year rollover for the day shift. */
function reminderTrigger(dateStr: string, daysBefore: number): Date | null {
  const due = parseLocalDate(dateStr);
  if (!due) return null;
  return new Date(due.getFullYear(), due.getMonth(), due.getDate() - daysBefore, 9, 0, 0, 0);
}

const KINDS: readonly (readonly [ReminderKind, number])[] = [
  ['week', 7],
  ['day', 1],
];

function pushReminders(
  out: DesiredReminder[],
  entityType: EntityType,
  entityId: string,
  dateStr: string,
  now: Date,
  contentFor: (kind: ReminderKind) => { title: string; body: string },
): void {
  for (const [kind, daysBefore] of KINDS) {
    const trigger = reminderTrigger(dateStr, daysBefore);
    // Skip-past rule: never fire catch-up notifications for triggers already elapsed.
    if (!trigger || trigger.getTime() <= now.getTime()) continue;
    const { title, body } = contentFor(kind);
    out.push({
      entityId,
      kind,
      trigger,
      triggerISO: trigger.toISOString(),
      content: { title, body, data: { entityType, entityId } },
    });
  }
}

/** Every reminder we want scheduled right now: a week-before + day-before at 09:00 for
 * each todo assignment with a future due date and each exam, dropping past triggers. */
export function computeDesiredReminders(now: Date = new Date()): DesiredReminder[] {
  const courseName = new Map(coursesCollection.getSnapshot().map((course) => [course.id, course.name]));
  const result: DesiredReminder[] = [];

  for (const assignment of assignmentsCollection.getSnapshot()) {
    if (assignment.status !== 'todo' || !assignment.dueDate) continue;
    const course = courseName.get(assignment.courseId);
    pushReminders(result, 'assignment', assignment.id, assignment.dueDate, now, (kind) =>
      assignmentContent(kind, assignment, course),
    );
  }

  for (const exam of examsCollection.getSnapshot()) {
    const course = courseName.get(exam.courseId);
    pushReminders(result, 'exam', exam.id, exam.date, now, (kind) => examContent(kind, exam, course));
  }

  return result;
}

// --- Android channel -----------------------------------------------------------

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'תזכורות',
    importance: Notifications.AndroidImportance.HIGH,
  });
  channelReady = true;
}

// --- reconcile -----------------------------------------------------------------

let running: Promise<void> | null = null;
let queued = false;

/**
 * Diff desired vs. scheduled and converge: cancel stale entries, schedule missing ones,
 * persist the map. No-op unless enabled + OS-granted (but still tears everything down if
 * disabled/revoked). Runs are serialized; a request during an in-flight run coalesces
 * into a single follow-up so a burst of writes reconciles cleanly.
 */
export function reconcileNotifications(): Promise<void> {
  if (running) {
    queued = true;
    return running;
  }
  running = doReconcile()
    .catch((error) => {
      console.warn('reconcileNotifications failed', error);
    })
    .finally(() => {
      running = null;
      if (queued) {
        queued = false;
        void reconcileNotifications();
      }
    });
  return running;
}

async function doReconcile(): Promise<void> {
  const map = loadMap();

  // Disabled or permission revoked → tear everything down and converge the map to empty.
  const granted = getNotificationsEnabled() ? (await Notifications.getPermissionsAsync()).granted : false;
  if (!granted) {
    if (Object.keys(map).length > 0) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      saveMap({});
    }
    return;
  }

  await ensureAndroidChannel();

  // Never trust the map blindly: cross-check against what the OS actually holds, so an
  // OS purge (or a manual clear) is treated as "missing" and rescheduled below.
  const actual = await Notifications.getAllScheduledNotificationsAsync();
  const actualIds = new Set(actual.map((entry) => entry.identifier));

  // Soonest-first, capped, to stay under the iOS 64-pending limit.
  const desired = computeDesiredReminders().sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
  if (desired.length > MAX_PENDING) {
    console.warn(
      `reconcileNotifications: ${desired.length} desired reminders exceeds cap; scheduling soonest ${MAX_PENDING}.`,
    );
  }
  const capped = desired.slice(0, MAX_PENDING);
  const desiredKeys = new Set(capped.map((d) => `${d.entityId}:${d.kind}:${d.triggerISO}`));

  // Live = in the map AND still present in the OS. Keyed by entity+kind+trigger, so a
  // changed due date (new triggerISO) reads as a different key → old cancelled, new added.
  const liveByKey = new Map<string, string>();
  for (const [entityId, entries] of Object.entries(map)) {
    for (const entry of entries) {
      if (actualIds.has(entry.id)) {
        liveByKey.set(`${entityId}:${entry.kind}:${entry.triggerISO}`, entry.id);
      }
    }
  }

  // Cancel anything scheduled that's no longer desired (gone/done/date-changed/over-cap).
  for (const [key, id] of liveByKey) {
    if (!desiredKeys.has(key)) {
      await Notifications.cancelScheduledNotificationAsync(id);
      liveByKey.delete(key);
    }
  }

  // Rebuild the map from the desired set, scheduling whatever isn't already live.
  const nextMap: ScheduledMap = {};
  for (const reminder of capped) {
    const key = `${reminder.entityId}:${reminder.kind}:${reminder.triggerISO}`;
    let id = liveByKey.get(key);
    if (!id) {
      id = await Notifications.scheduleNotificationAsync({
        content: reminder.content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.trigger,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
    }
    (nextMap[reminder.entityId] ??= []).push({ id, kind: reminder.kind, triggerISO: reminder.triggerISO });
  }

  saveMap(nextMap);
}

/** Turn the feature off: flip the flag, cancel every scheduled reminder, clear the map. */
export async function disableNotifications(): Promise<void> {
  setNotificationsEnabled(false);
  await Notifications.cancelAllScheduledNotificationsAsync();
  saveMap({});
}

/** Debug helper: nuke everything and rebuild from scratch. */
export async function rescheduleAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  saveMap({});
  await reconcileNotifications();
}

/**
 * Wire the reconciler to the data layer: reconcile once on app start, then on every
 * collection change (debounced, so the onboarding `addMany` flush reconciles once).
 * Returns an unsubscribe for symmetry, though in practice this lives for the app session.
 */
export function startNotificationSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void reconcileNotifications();
    }, 500);
  };

  const unsubscribes = [
    assignmentsCollection.subscribe(schedule),
    examsCollection.subscribe(schedule),
    coursesCollection.subscribe(schedule),
  ];

  void reconcileNotifications();

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
