# Plan 002: Implement the full pomodoro loop — breaks, rounds, configurable focus duration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1b73daf..HEAD -- 'src/app/(tabs)/pomodoro.tsx' src/data/pomodoro-timer.ts`
> Plan 001 intentionally changed these files — that is expected drift. Verify
> instead that `src/data/pomodoro-timer.ts` exists and exports `startTimer`,
> `pauseTimer`, `resetTimer`, `syncTimer`, `useTimerState`, `getSecondsLeft`,
> and a `TimerState` with `status/endAt/remainingSeconds/notificationId`. If
> it doesn't (plan 001 not executed, or its shape differs materially), STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW-MED (state machine growth; UI additions on an RTL screen)
- **Depends on**: advisor-plans/001-wall-clock-pomodoro-timer.md
- **Category**: direction
- **Planned at**: commit `1b73daf`, 2026-07-26

## Why this matters

The pomodoro screen's own instructions (`src/app/(tabs)/pomodoro.tsx:16-22`) tell the student to: set the pomodoro length ("להגדיר את משך הפומודורו"), take a 3–5 minute break after each ring, and take a longer 15–30 minute break after four rounds. The timer implements none of that — it is a fixed 25-minute countdown, so the app instructs users to run the actual method by hand around its own timer: eyeballing breaks, counting rounds in their head, and living with 25 minutes even if they study in 50-minute blocks. This plan productizes the loop the screen already describes: focus/break phases, a 4-round cycle, and a small set of focus-duration presets.

## Current state

This plan assumes plan 001 has landed. After 001:

- `src/data/pomodoro-timer.ts` — persisted wall-clock timer state machine: `TimerState { status: 'idle'|'running'|'paused'|'complete', endAt, remainingSeconds, notificationId }`, transitions `startTimer/pauseTimer/resetTimer/syncTimer`, hook `useTimerState`, derived `getSecondsLeft()`, kv key `'pomodoro.timer'`, and a completion notification scheduled at `endAt` (title "🍅 הפומודורו הסתיים").
- `src/app/(tabs)/pomodoro.tsx` — renders `formatTime(getSecondsLeft())`, start/pause/reset buttons, a completion line, and two static how-to sections. The how-to steps array (unchanged since commit `1b73daf`, lines 16-22):

```tsx
const HOW_TO_STEPS = [
  'להחליט על המשימה שיש לעשות',
  'להגדיר את משך הפומודורו (בדרך כלל 25 דקות)',
  'לעבוד על המשימה בתוך פרק הזמן הקצוב',
  'לאחר כל צלצול לצאת להפסקה קצרה (3–5 דקות) ולחזור לשלב 2',
  'לאחר ארבעה סבבים, לצאת להפסקה ארוכה יותר (15–30 דקות) ולחזור לשלב 1',
];
```

Repo conventions that apply:

- Persisted scalar settings follow `src/data/notification-settings.ts`: kv key + module value + listeners + `useSyncExternalStore` hook.
- Small selectable chips exist in the app: see `src/components/filter-chip.tsx` — reuse it if its API fits (a `Pressable` chip with selected state); otherwise build the preset buttons with the same `ThemedView`/`ThemedText` pattern the pomodoro buttons already use. Look at `filter-chip.tsx` first.
- RTL: every new row uses `rtlFlexDirection.row`, every new text uses `rtlTextAlign.start` (see existing `styles` in `pomodoro.tsx`). If an `rtl-layout` skill is available in your environment, invoke it before writing the UI.
- All strings Hebrew. Suggested copy is given per step below; keep it exactly unless it conflicts with existing strings.
- Analytics: posthog events are lowercase snake_case (`pomodoro_started`), properties snake_case (`seconds_left`).

## Commands you will need

| Purpose   | Command           | Expected on success |
|-----------|-------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | Only pre-existing errors (5 at plan time: `@/global.css` ×1, `expo-widgets` ×4); none in files you touch. |
| Lint      | `npm run lint`     | No problems in files you touch (baseline at plan time: 18 problems in other files). |

No test runner exists in this repo.

## Scope

**In scope**:

- `src/data/pomodoro-timer.ts` (extend the state machine)
- `src/app/(tabs)/pomodoro.tsx` (phase UI, round indicator, duration presets)

**Out of scope**:

- `src/data/notification-scheduler.ts`, `src/data/notification-settings.ts`, `src/app/_layout.tsx` — same boundaries as plan 001.
- Auto-starting the next phase (breaks start on user tap — deliberate v1 choice, do not add auto-advance).
- Custom/free-form durations (presets only), and configurable break lengths (fixed 5/15 min).
- The dashboard promo card (`src/app/(tabs)/index.tsx`) — its copy says "25 דקות"; leave it; plan 003 touches that card.

## Git workflow

- Branch: `advisor/002-pomodoro-breaks-cycles-duration`
- Commit style: short lowercase imperative (match `git log --oneline`). Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the state machine in `src/data/pomodoro-timer.ts`

Add to the persisted state (same kv key; bump-safe hydration):

```ts
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  status: TimerStatus;
  phase: TimerPhase;          // NEW — what the current countdown is
  round: number;              // NEW — 1..4, the focus round within the cycle
  endAt: number | null;
  remainingSeconds: number;
  notificationId: string | null;
}

export const SHORT_BREAK_SECONDS = 5 * 60;
export const LONG_BREAK_SECONDS = 15 * 60;
export const FOCUS_PRESETS_MINUTES = [15, 25, 50] as const;
```

Behavior:

1. **Hydration**: old persisted state (no `phase`/`round`) hydrates with `phase: 'focus'`, `round: 1`.
2. **Configurable focus duration**: a second kv scalar in this same module, key `'pomodoro.focusMinutes'`, default `25`, exported as `getFocusMinutes()` / `setFocusMinutes(minutes: number)` / `useFocusMinutes()` following the `notification-settings.ts` listener pattern (share this module's existing listener set — one notify covers both). `setFocusMinutes` is only honored while `status === 'idle' && phase === 'focus'`; it also updates `remainingSeconds` to the new duration so the display follows immediately.
3. **Phase-aware completion** (in the transition where `running` → `complete`):
   - completing a `focus` phase: `phase` becomes `round === 4 ? 'longBreak' : 'shortBreak'`, `remainingSeconds` set to that break's duration, status `complete` (the UI offers "start the break"; the round does NOT advance yet).
   - completing a `shortBreak`: `phase: 'focus'`, `round: round + 1`, `remainingSeconds: getFocusMinutes() * 60`.
   - completing a `longBreak`: `phase: 'focus'`, `round: 1`, `remainingSeconds: getFocusMinutes() * 60`.
4. **`startTimer()` from `complete`**: starts the already-staged next phase (state already holds the right `phase` + `remainingSeconds`) — it must no longer reset to a fresh focus session as in plan 001.
5. **`resetTimer()`**: back to `{ status: 'idle', phase: 'focus', round: 1, remainingSeconds: getFocusMinutes() * 60 }` (full cycle reset).
6. **Notification copy per phase** (completion notification from plan 001):
   - focus ends → title `'🍅 הפומודורו הסתיים'`, body `'עבודה טובה — זמן להפסקה'`
   - break ends → title `'⏰ ההפסקה הסתיימה'`, body `'מוכנים לסבב הבא?'`

**Verify**: `npx tsc --noEmit` → no errors in `src/data/pomodoro-timer.ts`.

### Step 2: Phase-aware UI in `src/app/(tabs)/pomodoro.tsx`

Above the numeric timer, inside the existing `timerSection`:

1. **Phase label** (`ThemedText type="smallBold"`): `'זמן ריכוז'` for focus, `'הפסקה קצרה'` / `'הפסקה ארוכה'` for breaks.
2. **Round indicator**: a row (`rtlFlexDirection.row`) of 4 dots; dots up to the current `round` filled (use the theme's text color at full opacity vs. a faded variant — follow how `segmented-bar.tsx` or existing components pick theme colors; keep it simple: two `ThemedView` styles).
3. **Duration presets**: visible only when `status === 'idle' && phase === 'focus'`. Three chips — `15 דק׳`, `25 דק׳`, `50 דק׳` — selected chip reflects `useFocusMinutes()`; tapping calls `setFocusMinutes(m)` and fires `posthog.capture('pomodoro_duration_changed', { minutes: m })`. Reuse `src/components/filter-chip.tsx` if its props fit; otherwise mirror the existing button pattern in this file.
4. **Completion line** becomes phase-aware: after focus — existing `'הפומודורו הסתיים — זמן להפסקה'`; after a break — `'ההפסקה הסתיימה — מוכנים להמשיך?'`. Primary button label when `status === 'complete'`: `'התחל הפסקה'` if the staged phase is a break, `'סבב חדש'` if it is focus.
5. **Analytics**: add `phase` and `round` properties to the existing `pomodoro_started` / `pomodoro_paused` / `pomodoro_completed` / `pomodoro_reset` captures. Only count `pomodoro_completed` when a **focus** phase completes (breaks get `pomodoro_break_completed`) — plan 003's session stats rely on this distinction.
6. **How-to copy**: update step 2 of `HOW_TO_STEPS` to reflect reality: `'לבחור את משך הפומודורו (15, 25 או 50 דקות)'`. Leave the other steps unchanged.

**Verify**: `npx tsc --noEmit` → only pre-existing errors. `npm run lint` → no problems in touched files.

### Step 3: Self-review the diff

Confirm: no auto-advance behavior snuck in (a completed phase waits for a tap); the keep-awake effect still keys on `running` regardless of phase (screen stays awake during breaks too — accepted); all analytics events compile with the new properties.

**Verify**: `git status --short` → only the two in-scope files modified.

## Test plan

No test infra; manual QA script (run in simulator if the environment allows, else report as not-run):

1. Idle: presets visible; tap `50 דק׳` → display shows `50:00`; kill + relaunch → still `50:00` and chip still selected.
2. Complete a focus round (temporarily shorten `FOCUS_PRESETS_MINUTES` locally to test — REVERT before committing) → phase label offers a short break, button reads `'התחל הפסקה'`, round dots unchanged.
3. Complete the short break → round advances to 2, focus staged at the chosen duration.
4. Rounds 1–4 then long break (15:00) → after it, round resets to 1.
5. Reset mid-cycle → idle, focus, round 1, chosen duration.

## Done criteria

- [ ] `npx tsc --noEmit` — no errors in in-scope files
- [ ] `npm run lint` — no problems in in-scope files
- [ ] `grep -n "shortBreak\|longBreak" src/data/pomodoro-timer.ts` → phase machine present
- [ ] `grep -n "pomodoro_duration_changed\|pomodoro_break_completed" 'src/app/(tabs)/pomodoro.tsx'` → both new events present
- [ ] `grep -n "בדרך כלל 25 דקות" 'src/app/(tabs)/pomodoro.tsx'` → no match (step-2 copy updated)
- [ ] `git status --short` — no files outside scope
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The drift check finds `pomodoro-timer.ts` missing or shaped materially differently than plan 001 specifies.
- `filter-chip.tsx` turns out to be tightly coupled to catalog filtering AND building plain chip buttons would require new shared components — report, don't invent a component library.
- Any step requires touching an out-of-scope file.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Plan 003 logs a session on **focus** completion — the `pomodoro_completed`-only-for-focus rule in Step 2.5 is load-bearing; a reviewer should check breaks don't emit it.
- If auto-start-next-phase is ever added, the completion notification copy ("מוכנים לסבב הבא?") and the staged-phase model here already support it — only `syncTimer()`'s complete transition changes.
- Break durations are deliberately fixed (5/15 min). If users ask for custom durations, extend the presets scalar, don't add a free-form input.
