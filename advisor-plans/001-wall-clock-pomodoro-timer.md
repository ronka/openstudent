# Plan 001: Make the pomodoro timer wall-clock-based, with a real completion "ring"

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1b73daf..HEAD -- 'src/app/(tabs)/pomodoro.tsx' src/data/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (timer state machine touches notifications; wrong cancel logic could interfere with assignment/exam reminders)
- **Depends on**: none
- **Category**: direction (foundational — every later pomodoro feature builds on this)
- **Planned at**: commit `1b73daf`, 2026-07-26

## Why this matters

The pomodoro timer counts down with `setInterval`, decrementing React state once per second. React Native suspends JS when the app is backgrounded, so the moment the student switches apps or the phone locks (with keep-awake off because the timer was paused, or via the power button), the countdown silently stalls and resumes late. Worse, when a session *does* finish, the only "signal" is a silent line of text and a posthog event — yet the screen's own instructions (`pomodoro.tsx:20`) tell the student to take a break "לאחר כל צלצול" ("after each ring"). There is no ring.

This plan re-bases the timer on wall-clock time (an `endAt` timestamp, with display time *derived* from it) and schedules a local notification for the completion moment, so the session completes correctly and audibly even if the app is backgrounded or killed. It also moves timer state into a small persisted data module, which plans 002 (breaks/cycles) and 003 (session stats) build on.

## Current state

Relevant files:

- `src/app/(tabs)/pomodoro.tsx` — the whole timer today: component-local state, `setInterval` tick, start/pause/reset handlers, keep-awake, posthog events, plus static how-to content (Hebrew, RTL).
- `src/data/kv-storage.ts` — sync key-value storage wrapper over `expo-sqlite/kv-store`: `getItemSync` / `setItemSync` / `removeItemSync`.
- `src/data/notification-settings.ts` — the repo's pattern for a persisted scalar with a reactive hook: module-level value + `Set` of listeners + `useSyncExternalStore`. **Match this pattern** for the new timer module.
- `src/data/notification-scheduler.ts` — the assignment/exam reminder reconciler. You will NOT modify it, but you must understand two facts: it uses Android channel `'reminders'` (`CHANNEL_ID`, line 21) created in `ensureAndroidChannel()` (lines 147–154), and its disable/teardown paths call `Notifications.cancelAllScheduledNotificationsAsync()` (lines 193, 259, 265) — which would also cancel a pending pomodoro notification. That interaction is accepted (see Maintenance notes).
- `src/app/_layout.tsx:25-32` — foreground notification handler is already configured app-wide (banner + sound in foreground), so a pomodoro-completion notification rings even with the app open:

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

The timer as it exists today, `src/app/(tabs)/pomodoro.tsx:32-52`:

```tsx
const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION_SECONDS);
const [isRunning, setIsRunning] = useState(false);
const [isComplete, setIsComplete] = useState(false);

useEffect(() => {
  if (!isRunning) return;

  const interval = setInterval(() => {
    setSecondsLeft((current) => {
      if (current <= 1) {
        clearInterval(interval);
        setIsRunning(false);
        setIsComplete(true);
        return 0;
      }
      return current - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [isRunning]);
```

Handlers (`pomodoro.tsx:69-86`) flip those flags and fire posthog events `pomodoro_started` / `pomodoro_paused` (with `seconds_left`) / `pomodoro_reset`; an effect at lines 54-56 fires `pomodoro_completed` when `isComplete` becomes true. A keep-awake effect (lines 60-67) activates while `isRunning` with tag `'pomodoro'`. Keep all of that behavior (events included) — only the timing mechanism changes.

The settings-module pattern to copy, from `src/data/notification-settings.ts:20-44` (abridged):

```ts
let enabled = getItemSync(ENABLED_KEY) === 'true';
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setNotificationsEnabled(value: boolean): void {
  enabled = value;
  setItemSync(ENABLED_KEY, value ? 'true' : 'false');
  notify();
}
// ...
export function useNotificationsEnabled(): boolean {
  return useSyncExternalStore(subscribe, getNotificationsEnabled);
}
```

Repo conventions that apply:

- All user-facing strings are Hebrew; layout is RTL via `@/utils/rtl` helpers (`rtlFlexDirection`, `rtlTextAlign`). Do not change any strings or styles in this plan.
- Project instructions (`AGENTS.md`) require consulting the Expo SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/ before writing code — the relevant pages are `expo-notifications` (already a dependency, `~57.0.6`) and AppState (React Native core).
- Comments in the data layer explain *why* (see the headers of `notification-scheduler.ts`, `store.ts`) — match that register, don't narrate the obvious.

## Commands you will need

| Purpose   | Command           | Expected on success |
|-----------|-------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | Exactly 5 pre-existing errors, no more: 1× `TS2882` for `@/global.css` in `src/constants/theme.ts`, 4× `TS2307` for `expo-widgets` in `src/widgets/*`. Any error in a file you touched = failure. |
| Lint      | `npm run lint`     | Exactly the pre-existing baseline: `✖ 18 problems (10 errors, 8 warnings)`, none of them in files you touched. |

There is no test runner in this repo (no jest/vitest configured) — verification is typecheck + lint + the manual QA script in the Test plan.

## Suggested executor toolkit

- If a `rtl-layout` skill is available in your environment, invoke it before touching any styles in `pomodoro.tsx` (you shouldn't need to, but the file is RTL-sensitive).
- Read https://docs.expo.dev/versions/v57.0.0/sdk/notifications/ — specifically `scheduleNotificationAsync` with a `DATE` trigger and `cancelScheduledNotificationAsync`.

## Scope

**In scope** (the only files you should modify/create):

- `src/data/pomodoro-timer.ts` (create)
- `src/app/(tabs)/pomodoro.tsx` (rewire timer logic to the new module)

**Out of scope** (do NOT touch, even though they look related):

- `src/data/notification-scheduler.ts` — the reminder reconciler must not know about the pomodoro; its `cancelAllScheduledNotificationsAsync` interaction is accepted as-is.
- `src/data/notification-settings.ts` — read-only exemplar; the pomodoro reuses its getters, doesn't change them.
- `src/app/_layout.tsx` — the foreground handler is already correct.
- The how-to content, styles, and strings in `pomodoro.tsx` — content changes belong to plan 002.
- No new dependencies (no expo-haptics, no expo-audio — the notification's default sound is the ring).

## Git workflow

- Branch: `advisor/001-wall-clock-pomodoro-timer`
- Commit style: short lowercase imperative, matching `git log` (e.g. "fix Android crash: cap native tabs at 5 with a "more" menu"). One commit per step is fine.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `src/data/pomodoro-timer.ts`

Status: done

A persisted timer state machine following the `notification-settings.ts` module pattern (module state + listeners + `useSyncExternalStore` hook). Target shape:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import { getItemSync, setItemSync } from './kv-storage';
import { getNotificationsEnabled } from './notification-settings';

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
```

Requirements:

1. **Persistence**: keep the state under kv key `'pomodoro.timer'` (JSON). Hydrate at module load; on parse failure fall back to `{ status: 'idle', endAt: null, remainingSeconds: FOCUS_DURATION_SECONDS, notificationId: null }`. If hydrated state is `running` but `endAt <= Date.now()`, convert it to `complete` with `remainingSeconds: 0` (the session finished while the app was dead). Persist on every transition.
2. **Derived display time**: export `getSecondsLeft(now?: number): number` — while running, `Math.max(0, Math.ceil((endAt - now) / 1000))`; otherwise `remainingSeconds`.
3. **Transitions** (each persists + notifies listeners):
   - `startTimer()`: from `idle`/`paused`/`complete` (if `remainingSeconds > 0`; from `complete` treat as full reset to `FOCUS_DURATION_SECONDS` first) → `running`, `endAt = Date.now() + remainingSeconds * 1000`, then schedule the completion notification (see requirement 4).
   - `pauseTimer()`: `running` → `paused`, `remainingSeconds = getSecondsLeft()`, `endAt = null`, cancel the pending notification.
   - `resetTimer()`: any → `idle`, `remainingSeconds = FOCUS_DURATION_SECONDS`, cancel the pending notification.
   - `syncTimer()`: while `running`, if `getSecondsLeft() === 0` → `complete` (with `remainingSeconds: 0`, `endAt: null`, `notificationId: null` — the notification has already fired, do not cancel it). Safe to call anytime; no-op otherwise. The UI tick and the AppState listener both call this.
4. **Completion notification**: on `startTimer()`, if `getNotificationsEnabled()` is true AND `(await Notifications.getPermissionsAsync()).granted`, schedule:
   ```ts
   Notifications.scheduleNotificationAsync({
     content: { title: '🍅 הפומודורו הסתיים', body: 'עבודה טובה — זמן להפסקה קצרה' },
     trigger: {
       type: Notifications.SchedulableTriggerInputTypes.DATE,
       date: new Date(endAt),
       ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
     },
   });
   ```
   Store the returned id in state (`notificationId`) so pause/reset can cancel it. Scheduling is async — fire-and-forget from the sync transition (`void (async () => ...)()`), storing the id when it resolves; if the timer is no longer `running` with the same `endAt` when the promise resolves (user paused immediately), cancel the just-created notification instead of storing it. When permission is missing, skip scheduling silently — the in-app completion state is the fallback. The Android channel `'reminders'` may not exist yet if the reminder reconciler never ran with permission granted; that is fine — Expo falls back to the default channel behavior — but mirror the scheduler and don't create channels here.
   Cancellation helper: `void Notifications.cancelScheduledNotificationAsync(id)` wrapped in try/catch-swallow (cancelling an already-fired id must not throw user-visibly).
5. **Reactive hook**: export `useTimerState(): TimerState` via `useSyncExternalStore` (same subscribe/getSnapshot structure as `notification-settings.ts`). Snapshot must be referentially stable between notifications — keep one state object, replace it wholesale on transition.
6. Module header comment: explain the wall-clock design in one short paragraph (why `endAt`, why persistence, the accepted `cancelAll` interaction with the reminder reconciler) — matching the register of `notification-scheduler.ts`'s header.

**Verify**: `npx tsc --noEmit` → only the 5 known pre-existing errors, none in `src/data/pomodoro-timer.ts`.

### Step 2: Rewire `src/app/(tabs)/pomodoro.tsx` onto the module

Status: done

- Delete the local `FOCUS_DURATION_SECONDS`, `secondsLeft`/`isRunning`/`isComplete` state and the countdown `useEffect` (lines 12, 32-52 in the current file).
- Read state via `const timer = useTimerState()` and keep a lightweight local tick to refresh the derived display while running:
  ```tsx
  const [, forceTick] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    if (timer.status !== 'running') return;
    const interval = setInterval(() => {
      syncTimer();
      forceTick();
    }, 250);
    return () => clearInterval(interval);
  }, [timer.status]);
  ```
  Display `formatTime(getSecondsLeft())`. The 250ms cadence keeps the display within a quarter-second of wall clock; `syncTimer()` flips to `complete` at zero.
- Resync on foreground so a backgrounded completion is detected immediately (pattern: `src/widgets/updater.ts:53` uses `AppState.addEventListener('change', ...)`):
  ```tsx
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncTimer();
    });
    return () => sub.remove();
  }, []);
  ```
- Map the existing UI to the new state: `isRunning` → `timer.status === 'running'`, `isComplete` → `timer.status === 'complete'`, start-button label condition `secondsLeft === FOCUS_DURATION_SECONDS` → `timer.status === 'idle'`.
- Handlers call `startTimer()` / `pauseTimer()` / `resetTimer()` and keep the exact same posthog events, including `seconds_left: getSecondsLeft()` on pause.
- Keep the `pomodoro_completed` effect keyed on completion, and the keep-awake effect keyed on running, both unchanged in behavior.
- Do not touch any styles, strings, or the how-to sections.

**Verify**: `npx tsc --noEmit` → only the 5 known errors. `npm run lint` → `✖ 18 problems (10 errors, 8 warnings)`, none in the two in-scope files.

### Step 3: Self-review the diff

Status: done

`git diff` — confirm: no changes outside the two in-scope files; no string or style changes in `pomodoro.tsx`; all four posthog events still present with the same names and properties.

**Verify**: `git status --short` → only `src/data/pomodoro-timer.ts` (new) and `src/app/(tabs)/pomodoro.tsx` (modified).

## Test plan

No test infrastructure exists in this repo; do not add one in this plan. Manual QA script (run in the iOS simulator or an Android emulator via `npm run ios` / `npm run android` if the environment allows; otherwise list it in your report as not-run):

1. Start the timer → display counts down; pause → freezes; resume ("המשך") → continues from the same value.
2. While running, background the app for ~30s, foreground → display has jumped by the elapsed wall time (not stalled).
3. With notifications enabled in the app's settings screen and OS permission granted, start a session, background the app → at the end moment a notification with title "🍅 הפומודורו הסתיים" fires with sound.
4. Start then immediately pause → no notification fires at the would-have-been end time.
5. Kill the app mid-session, wait past the end, relaunch → screen shows 00:00 + the completion message.

## Done criteria

Machine-checkable. ALL must hold:

- [x] `npx tsc --noEmit` reports no new errors in in-scope files (baseline was 7 pre-existing errors, not 5 — see note below; both in-scope files are clean)
- [x] `npm run lint` reports exactly `18 problems`, none in in-scope files
- [x] `grep -n "setInterval" 'src/app/(tabs)/pomodoro.tsx'` shows only the display-tick interval from Step 2 (no state-decrementing countdown)
- [x] All four `pomodoro_*` events preserved: `started`/`paused`/`reset` in the screen (grep → 3), `completed` relocated to `syncTimer()` in `pomodoro-timer.ts` (grep → 1). Moved during code-quality review to fire once at the state transition instead of a mount-sensitive render effect (persisted `complete` state was re-firing the event on every remount).
- [x] `git status --short` shows no files outside the in-scope list (other entries pre-date this plan's execution)
- [x] `advisor-plans/README.md` status row updated

> **Baseline note (executor)**: `npx tsc --noEmit` at execution reported **7** pre-existing
> errors, not 5 — the plan/README baseline omitted two CSS-module errors
> (`src/app/_layout.tsx` `@/src/global.css`, `src/components/animated-icon.web.tsx`
> `./animated-icon.module.css`). Both are in untouched files; the in-scope files add zero
> errors, so the "no new errors" gate holds.

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `pomodoro.tsx` or `src/data/` changed since commit `1b73daf` and the excerpts above no longer match.
- `Notifications.SchedulableTriggerInputTypes.DATE` or `getPermissionsAsync` don't exist under the installed `expo-notifications` types — the SDK 57 API surface differs from this plan's assumption.
- Typecheck or lint produce a NEW error in a file you touched that survives two fix attempts.
- You find yourself needing to edit `notification-scheduler.ts` or `_layout.tsx` to make anything work.

## Maintenance notes

- **Accepted interaction**: `disableNotifications()` / a permission-revoked reconcile calls `cancelAllScheduledNotificationsAsync`, which also cancels a pending pomodoro ring. The session still completes correctly in-app (wall-clock derived); only the ring is lost. If this ever matters, the fix is tracking and re-scheduling from `syncTimer()`, not touching the reconciler.
- Plans 002 (breaks/cycles/configurable duration) and 003 (session log + stats) extend `pomodoro-timer.ts`; reviewers should check the state machine stays a single persisted object with `useSyncExternalStore` semantics (stable snapshots).
- If the timer display ever moves to a component that unmounts (e.g. out of the tab navigator), the AppState resync must move to the module (started once from `_layout.tsx`), like `startNotificationSync()`.
