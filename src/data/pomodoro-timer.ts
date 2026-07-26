import * as Notifications from 'expo-notifications';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { getItemSync, setItemSync } from './kv-storage';
import { getNotificationsEnabled } from './notification-settings';

/**
 * Wall-clock pomodoro timer (see plan 001). The countdown is anchored to an `endAt`
 * epoch timestamp, not a per-second React tick, so it stays correct even while JS is
 * suspended (app backgrounded, phone locked, process killed): the display time is
 * *derived* from `endAt - now`, and the whole state object is persisted on every
 * transition so a session that finishes while the app is dead surfaces as `complete`
 * on next launch. Completion is also scheduled as a local notification for the exact
 * end moment, so the "ring" fires with sound even in the background.
 *
 * Accepted interaction: the reminder reconciler's disable/teardown path calls
 * `cancelAllScheduledNotificationsAsync`, which would also drop a pending pomodoro ring.
 * The session still completes correctly in-app (it's wall-clock derived) — only the
 * audible ring is lost — so we accept it rather than coupling the two modules.
 */

const STORAGE_KEY = 'pomodoro.timer';

export const FOCUS_DURATION_SECONDS = 25 * 60;

export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete';

export interface TimerState {
  status: TimerStatus;
  /** Epoch ms when the running session ends; only meaningful while `running`. */
  endAt: number | null;
  /** Seconds remaining; authoritative while `idle`/`paused`/`complete`. */
  remainingSeconds: number;
  /** Notification id scheduled for the completion moment, if any. */
  notificationId: string | null;
}

const IDLE_STATE: TimerState = {
  status: 'idle',
  endAt: null,
  remainingSeconds: FOCUS_DURATION_SECONDS,
  notificationId: null,
};

// --- persistence + hydration ---------------------------------------------------

function hydrate(): TimerState {
  const raw = getItemSync(STORAGE_KEY);
  if (!raw) return { ...IDLE_STATE };
  try {
    const parsed = JSON.parse(raw) as TimerState;
    // Session that ended while the app was dead: surface it as complete on launch.
    if (parsed.status === 'running' && (parsed.endAt === null || parsed.endAt <= Date.now())) {
      return { status: 'complete', endAt: null, remainingSeconds: 0, notificationId: null };
    }
    return parsed;
  } catch {
    return { ...IDLE_STATE };
  }
}

let state: TimerState = hydrate();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Replace the state wholesale (keeps snapshots referentially stable), persist, notify. */
function setState(next: TimerState): void {
  state = next;
  setItemSync(STORAGE_KEY, JSON.stringify(state));
  notify();
}

// --- notification helpers ------------------------------------------------------

/** Best-effort cancel; cancelling an already-fired id must never throw user-visibly. */
function cancelNotification(id: string | null): void {
  if (!id) return;
  void Notifications.cancelScheduledNotificationAsync(id).catch(() => {
    // swallow — the id may have already fired or been cleared by the OS.
  });
}

/**
 * Schedule the completion ring for `endAt`. Fire-and-forget: scheduling is async but the
 * transition is sync, so we store the id when it resolves — unless the user paused/reset
 * in the meantime (timer no longer `running` at the same `endAt`), in which case we cancel
 * the just-created notification instead. Skips silently without permission — the in-app
 * `complete` state is the fallback.
 */
function scheduleCompletionNotification(endAt: number): void {
  if (!getNotificationsEnabled()) return;
  void (async () => {
    try {
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) return;
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: '🍅 הפומודורו הסתיים', body: 'עבודה טובה — זמן להפסקה קצרה' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endAt),
          ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
        },
      });
      if (state.status === 'running' && state.endAt === endAt) {
        setState({ ...state, notificationId: id });
      } else {
        cancelNotification(id);
      }
    } catch {
      // swallow — a failed schedule just means no ring; completion still works in-app.
    }
  })();
}

// --- derived display time ------------------------------------------------------

/** Seconds to show: derived from the wall clock while running, stored otherwise. */
export function getSecondsLeft(now: number = Date.now()): number {
  if (state.status === 'running' && state.endAt !== null) {
    return Math.max(0, Math.ceil((state.endAt - now) / 1000));
  }
  return state.remainingSeconds;
}

// --- transitions ---------------------------------------------------------------

/** Start (or resume) a session. From `complete`, treat it as a full reset first. */
export function startTimer(): void {
  if (state.status === 'running') return;
  const remaining = state.status === 'complete' ? FOCUS_DURATION_SECONDS : state.remainingSeconds;
  if (remaining <= 0) return;
  const endAt = Date.now() + remaining * 1000;
  setState({ status: 'running', endAt, remainingSeconds: remaining, notificationId: null });
  scheduleCompletionNotification(endAt);
}

/** Freeze the running session, banking the derived remaining time. */
export function pauseTimer(): void {
  if (state.status !== 'running') return;
  cancelNotification(state.notificationId);
  setState({ status: 'paused', endAt: null, remainingSeconds: getSecondsLeft(), notificationId: null });
}

/** Back to a fresh, full session. */
export function resetTimer(): void {
  cancelNotification(state.notificationId);
  setState({ status: 'idle', endAt: null, remainingSeconds: FOCUS_DURATION_SECONDS, notificationId: null });
}

/**
 * Flip a finished running session to `complete`. Safe to call anytime (no-op unless the
 * clock has reached zero while running). The notification has already fired at this point,
 * so we do NOT cancel it. Driven by the UI tick and the AppState foreground listener.
 */
export function syncTimer(): void {
  if (state.status !== 'running') return;
  if (getSecondsLeft() === 0) {
    setState({ status: 'complete', endAt: null, remainingSeconds: 0, notificationId: null });
  }
}

// --- reactive hook -------------------------------------------------------------

function getSnapshot(): TimerState {
  return state;
}

/** Reactive read of the whole timer state; snapshots are stable between transitions. */
export function useTimerState(): TimerState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
