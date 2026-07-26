# Plan 003: Log completed pomodoro sessions locally and surface focus stats

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1b73daf..HEAD -- src/data/ 'src/app/(tabs)/'`
> Plans 001/002 intentionally changed `pomodoro-timer.ts` and `pomodoro.tsx`.
> Verify the excerpts under "Current state" below for the files THIS plan
> touches (`store.ts`, `stats.ts`, `index.tsx`, `settings.tsx`); on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive; the one shared-file edit is exporting an existing function)
- **Depends on**: advisor-plans/001-wall-clock-pomodoro-timer.md (completion is detected reliably, incl. after app kill). Composes with 002 if present, but does not require it.
- **Category**: direction
- **Planned at**: commit `1b73daf`, 2026-07-26

## Why this matters

The app already treats pomodoro sessions as worth counting — `pomodoro_started` / `pomodoro_completed` go to posthog — but that data is visible only to the developer, never to the student. For a study-habit tool, seeing "3 pomodoros today" is the feedback loop that makes the habit stick, and the dashboard already has a pomodoro promo card whose static copy could become live ("היום השלמת 3 פומודורו"). All the infrastructure exists: a persisted-collection factory in `store.ts`, a pure derived-stats module (`stats.ts`) explicitly designed "so the homepage stays declarative and the math is reusable/testable", and the dashboard card. This plan connects them.

## Current state

- `src/data/store.ts` — `createCollection<T extends { id: string }>(key, initial)` (lines 21-60) builds a persisted, subscribable collection (hydrate from kv JSON, write-through on change, `useSyncExternalStore`-compatible). It is currently **module-private**; `coursesCollection` / `assignmentsCollection` / `examsCollection` are built from it (lines 62-64). `resetAllData()` at lines 98-102:

```ts
export function resetAllData() {
  coursesCollection.reset();
  assignmentsCollection.reset();
  examsCollection.reset();
}
```

- `src/app/(tabs)/settings.tsx:62` — the only `resetAllData()` call site (the "reset all data" settings action).
- `src/data/stats.ts` — pure functions over arrays, nothing reads the store directly ("always pass the arrays in" — header, lines 1-5). Exemplar shape: `assignmentBreakdown(assignments)` (lines 139-149) — a loop and a returned stats object.
- `src/data/pomodoro-timer.ts` (from plan 001) — persisted timer state machine; the `running → complete` transition in `syncTimer()`/hydration is the single place a focus session is known to have finished. If plan 002 landed, completion is phase-aware and only `phase === 'focus'` completions count.
- `src/app/(tabs)/index.tsx:214-228` — the dashboard promo card:

```tsx
<HighlightCard
  tone="destructive"
  soft
  emoji="🍅"
  title="בואו נלמד עם פומודורו"
  subtitle="התמקדו 25 דקות בכל פעם — הקישו כדי להתחיל"
  trailing={...}
  href="/pomodoro"
  style={styles.fullWidth}
  onPress={() => posthog.capture('dashboard_pomodoro_promo_tapped')}
/>
```

- Entity id convention: prefix + timestamp, e.g. `` `a-${Date.now()}` `` (`src/components/assignment-form-modal.tsx:91`).
- Date handling convention: `src/utils/date.ts` (`parseLocalDate` parses `YYYY-MM-DD` at local noon). Sessions store a full ISO timestamp instead — they are moments, not calendar dates — but day-bucketing must use **local** date parts, not UTC (see Step 2).

## Commands you will need

| Purpose   | Command           | Expected on success |
|-----------|-------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | Only pre-existing errors (5 at plan time: `@/global.css` ×1, `expo-widgets` ×4); none in files you touch. |
| Lint      | `npm run lint`     | No problems in files you touch (baseline at plan time: 18 problems in other files). |

No test runner exists in this repo.

## Scope

**In scope**:

- `src/data/store.ts` — ONLY: add `export` to `createCollection`, and one line in `resetAllData` is NOT added here (cycle risk — see Step 3; the reset is wired in `settings.tsx`).
- `src/data/pomodoro-sessions.ts` (create)
- `src/data/pomodoro-timer.ts` — call the session logger on focus completion
- `src/data/stats.ts` — add `pomodoroSessionStats`
- `src/app/(tabs)/pomodoro.tsx` — one stats line under the timer
- `src/app/(tabs)/index.tsx` — live subtitle on the promo card
- `src/app/(tabs)/settings.tsx` — reset sessions alongside `resetAllData()`

**Out of scope**:

- Streaks, charts, weekly goals — deliberately deferred; today/week/total only.
- Widgets (`src/widgets/`) — a "focus" widget is a separate decision.
- Any change to `createCollection`'s behavior — export it, don't modify it.
- posthog events — existing analytics stay exactly as they are.

## Git workflow

- Branch: `advisor/003-pomodoro-session-log-and-stats`
- Commit style: short lowercase imperative (match `git log --oneline`). Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Export the collection factory and create `src/data/pomodoro-sessions.ts`

In `store.ts`, change `function createCollection` to `export function createCollection` — nothing else.

New module:

```ts
import { createCollection } from './store';

export interface PomodoroSession {
  id: string;                // `p-${completedAt epoch ms}`
  completedAt: string;       // full ISO timestamp (new Date().toISOString())
  durationSeconds: number;   // the focus duration that was completed
}

export const pomodoroSessionsCollection = createCollection<PomodoroSession>('data.pomodoroSessions', []);

export function logCompletedSession(durationSeconds: number, completedAt: Date = new Date()): void { ... }

export function usePomodoroSessions(): PomodoroSession[] { ... }  // useSyncExternalStore over the collection, mirroring useAssignments in store.ts:70-72
```

`logCompletedSession` guards against double-logging: skip if the newest existing session has the same id (`p-` + same ms) — cheap idempotency for a double `syncTimer` race.

**Verify**: `npx tsc --noEmit` → no errors in the new/changed files.

### Step 2: Log on focus completion + derived stats

1. In `src/data/pomodoro-timer.ts`, at the single `running → complete` transition (both the `syncTimer()` path and the hydration path where a session finished while the app was dead): if the completed phase is focus (always, if plan 002 is absent), call `logCompletedSession(<the session's full duration in seconds>)`. Import normally — `pomodoro-sessions.ts` imports from `store.ts`, and `pomodoro-timer.ts` imports `pomodoro-sessions.ts`; no cycle (verify `store.ts` does not import the timer).
2. In `src/data/stats.ts`, add (matching the module's pure style and doc-comment register):

```ts
export interface PomodoroStats {
  todayCount: number;
  weekCount: number;      // rolling 7 days including today
  totalMinutes: number;   // all-time focus minutes
}

export function pomodoroSessionStats(sessions: PomodoroSession[], now: Date = new Date()): PomodoroStats
```

Day-bucketing must be **local**: a session counts as "today" when its `new Date(completedAt)` has the same local `getFullYear/getMonth/getDate` as `now`. "Week" = `completedAt` within the last 7×24h of `now`.

**Verify**: `npx tsc --noEmit` → only pre-existing errors.

### Step 3: Surface the stats

1. `src/app/(tabs)/pomodoro.tsx` — under the timer section (inside `timerSection`, after the controls), when `todayCount > 0`, one secondary line: `` `היום: ${todayCount} פומודורו · השבוע: ${weekCount}` `` (`ThemedText type="small" themeColor="textSecondary"`, `textAlign: rtlTextAlign.center`).
2. `src/app/(tabs)/index.tsx` — promo card subtitle becomes live: when `todayCount > 0`, `` `היום השלמתם ${todayCount} פומודורו — ממשיכים?` ``, else keep the existing static string. Use `usePomodoroSessions()` + `pomodoroSessionStats` at the top of the component alongside the other stats hooks.
3. `src/app/(tabs)/settings.tsx` — where `resetAllData()` is called (line 62 at plan time), also call `pomodoroSessionsCollection.reset()` (import from `@/data/pomodoro-sessions`). Do NOT add the import/call inside `store.ts` — `pomodoro-sessions.ts` imports `store.ts`, so resetting from `store.ts` would create an import cycle.

**Verify**: `npx tsc --noEmit` → only pre-existing errors. `npm run lint` → no problems in touched files.

## Test plan

No test infra; manual QA (simulator if available, else report as not-run):

1. Complete a focus session → pomodoro screen shows `היום: 1 פומודורו · השבוע: 1`; dashboard card subtitle shows the live count.
2. Kill + relaunch → counts persist.
3. Pause/reset mid-session → no session logged.
4. Settings → reset all data → counts return to zero and the card shows the static subtitle.
5. (If plan 002 landed) complete a break → no session logged.

## Done criteria

- [ ] `npx tsc --noEmit` — no errors in in-scope files
- [ ] `npm run lint` — no problems in in-scope files
- [ ] `grep -n "export function createCollection" src/data/store.ts` → 1 match; `git diff src/data/store.ts` shows ONLY that keyword addition
- [ ] `grep -n "logCompletedSession" src/data/pomodoro-timer.ts` → present at the completion transition
- [ ] `grep -rn "data.pomodoroSessions" src/data/` → exactly one definition site
- [ ] `grep -n "pomodoroSessionsCollection.reset" 'src/app/(tabs)/settings.tsx'` → 1 match, and `grep -n "pomodoro" src/data/store.ts` → no matches beyond the exported factory (no cycle)
- [ ] `git status --short` — no files outside scope
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Plan 001 has not been executed (`src/data/pomodoro-timer.ts` missing).
- `store.ts` has drifted: `createCollection` no longer matches the excerpt, or it already imports anything from the pomodoro modules (cycle risk assumption broken).
- The `settings.tsx` reset call site can't be found or has moved into `store.ts` internals.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The session log is unbounded but tiny (one small record per completed session; a heavy user logs ~10/day). If it ever matters, cap hydration to the last N=1000 in `pomodoro-sessions.ts` — not in `createCollection`.
- Reviewer should scrutinize: local-time day bucketing (a UTC `toISOString().slice(0,10)` comparison would be wrong near midnight in UTC+2/+3 Israel time), and that `store.ts`'s diff is exactly one `export` keyword.
- Deferred follow-ups: streak counting, a focus-time widget (would reuse `pomodoroSessionStats` — the stats module's pass-arrays-in design was chosen exactly so widgets can share it), and per-course attribution (blocked on linking a session to a task — see "considered and rejected" in `advisor-plans/README.md`).
