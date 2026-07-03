# Plan: App Onboarding

> Generated from: ONBOARDING_PLAN.md
> Date: 2026-07-02

## Overview

Replace the Notion-derived mock data with a real first-launch experience: a six-screen,
Hebrew-RTL, story-arc onboarding (problem → question → reflection → setup → summary) that
leaves the user with their current semester's courses, tasks and exams persisted on
device. Past courses, grades, materials and recordings are deferred to in-app flows with
empty-state nudges. Requires making the course catalog standalone and adding a minimal
`expo-sqlite/kv-store` persistence layer under the existing collection store.

---

## Tasks

### Task 1: Standalone catalog + clear mock data

Status: done

- **Type**: AFK
- **Blocked by**: None - can start immediately

#### What to build

Make `COURSE_CATALOG` in `src/data/catalog.ts` a literal static array (the 25 course
identity rows: number, name, faculty, credits, type, level), removing its derivation from
`seedCourses`. Then delete `src/data/seed.ts`, start all collections in
`src/data/store.ts` from `[]`, and fix every import of the seed module
(`grep -r "data/seed" src`). `resetAllData()` now means "empty everything".
See ONBOARDING_PLAN.md §3.1–§3.2.

#### Acceptance criteria

- [x] `src/data/seed.ts` no longer exists; no file imports it
- [x] Fresh app launch shows empty states on every tab (dashboard, plan, exams, materials)
- [x] The course catalog picker still lists all 25 courses and adding a course works end-to-end
- [x] `resetAllData()` empties all collections instead of restoring seed rows
- [x] Lint and type-check pass

#### User stories addressed

- Remove mock data (§1 goal: app starts with empty collections)

---

### Task 2: Persistence layer (kv-store + onboarding flag)

Status: done

- **Type**: AFK
- **Blocked by**: Task 1

#### What to build

Install `expo-sqlite` and use `expo-sqlite/kv-store` (read the Expo v57 docs first, per
AGENTS.md). Inside `createCollection` in `src/data/store.ts`, hydrate `items` from a JSON
snapshot key on creation (`Storage.getItemSync`) and write-through on every `notify()`.
One key per collection (`data.courses`, `data.assignments`, `data.exams`,
`data.recordings`, `data.materials`) — no call-site changes. Add
`src/data/onboarding.ts` with `hasCompletedOnboarding()` / `markOnboardingComplete()` /
`resetOnboarding()` over the same store. Verify web behavior of kv-store in SDK 57;
guard with a localStorage fallback if needed. See ONBOARDING_PLAN.md §3.3–§3.4.

#### Acceptance criteria

- [x] Adding a course/assignment/exam, killing the app, and relaunching shows the same data
- [x] `resetAllData()` clears the persisted snapshots too (not just memory)
- [x] `onboarding.ts` flag survives restart and is readable synchronously at startup
- [x] No changes required in any screen/component call site
- [x] Works on iOS and web (native path or documented fallback)

#### User stories addressed

- Persist (§1 goal: onboarding runs once; data survives restart)

---

### Task 3: Onboarding gate + intro screens (1–3)

Status: done

- **Type**: AFK
- **Blocked by**: Task 2

#### What to build

Create `src/app/onboarding.tsx` (single route, internal step state machine, progress
dots) with screens 1–3 from ONBOARDING_PLAN.md §4: problem recognition, the single
"מה הכי מציק לך" question (📅/🧭/🎧/📚, single select), and the branching reflection
screen. Add a temporary "finish" action after screen 3 that calls
`markOnboardingComplete()` and routes to `(tabs)` (replaced by the real flow in Tasks
4–6). Gate routes in `src/app/_layout.tsx` with `Stack.Protected` guards (or `<Redirect>`
fallback) on the onboarding flag. Visual rules per §5: one emoji per headline, theme
tokens only, RTL utilities, progress dots top-center.

#### Acceptance criteria

- [x] Fresh install (or cleared flag) lands on onboarding, not tabs; no flash of tabs
- [x] Question requires a selection before continuing; reflection copy matches the chosen answer
- [x] Finishing lands in `(tabs)`; relaunching the app skips onboarding entirely
- [x] Screens render correctly in RTL with theme colors in light and dark mode
- [x] Progress dots reflect the current step

#### User stories addressed

- Story arc intro: problem recognition, commitment question, reflection (§4 screens 1–3)
- Onboarding runs once (§1, §6)

---

### Task 4: Course-selection step (screen 4)

Status: done

- **Type**: AFK
- **Blocked by**: Task 3

#### What to build

Extract the catalog list UI from `CourseCatalogPicker` into a shared `CourseCatalogList`
component (the modal keeps working), and use it in onboarding screen 4: headline, search,
multi-select, auto-detected semester chip (`getCurrentSemester()`, tappable to change),
primary button `המשך עם N קורסים` (disabled at 0), and the `אין לי קורסים כרגע` escape
link (routes to the finish step; its dedicated empty-state variant arrives in Task 6).
On continue, create the `Course` rows in `coursesCollection` with the chosen
year/semester. See ONBOARDING_PLAN.md §4 screen 4.

#### Acceptance criteria

- [x] Selected courses are created with the detected (or edited) semester/year and status `studying`
- [x] After finishing onboarding, the dashboard "הסמסטר הנוכחי" card lists the chosen courses
- [x] Already-enrolled courses show checked/disabled when re-entering the step
- [x] Continue is disabled with 0 selected; the escape link still allows completing onboarding
- [x] `CourseCatalogPicker` modal (used in-app) still works unchanged

#### User stories addressed

- Onboard the current semester — courses (§1 goal, §4 screen 4)

---

### Task 5: Per-course tasks + exam loop (screen 5)

Status: done

- **Type**: AFK
- **Blocked by**: Task 4

#### What to build

Extract the two-phase body of `QuickTasksModal` into a shared `QuickTasksForm` (modal
keeps working) and build the per-course sub-screen loop: header `קורס 2/3 · <שם>`,
section א with ממ״נ/ממ״ח count chips + due-date review rows (empty → 30 days out),
section ב with an optional exam `DateField` (`מתי המבחן? (אפשר לדלג)`), primary
`שמור והמשך`, ghost `דלג על הקורס הזה`. Saving writes assignments via
`assignmentsCollection.addMany` and an `Exam` (titled with the course name) when a date
is set. See ONBOARDING_PLAN.md §4 screen 5.

#### Acceptance criteria

- [x] Each selected course gets its own sub-screen with correct `קורס i/N` progress
- [x] Created tasks and exams appear on the dashboard (משימות TODO, מבחנים קרבים) after finishing
- [x] Skipping a course creates nothing for it and advances the loop
- [x] Empty due dates default to 30 days out, matching `QuickTasksModal` behavior
- [x] `QuickTasksModal` (used in-app after adding courses) still works unchanged

#### User stories addressed

- Onboard the current semester — tasks and exams (§1 goal, §4 screen 5)

---

### Task 6: Summary screen (screen 6) + empty-state variant

Status: done

- **Type**: AFK
- **Blocked by**: Task 5

#### What to build

Replace the temporary finish from Task 3 with the real climax screen: `הסמסטר שלך מוכן ✨`,
a `DashboardCard`-styled summary with real counts (`📖 N קורסים · ✍️ N מטלות · 🗓️ N מבחנים`),
the nearest-deadline callout, the mirrored screen-2 answer line, and the deferral line
about backfilling past courses from "תוכנית". Primary `לדשבורד →` marks onboarding
complete and routes to tabs. Add the `מתחילים נקי 🌱` empty-state variant for the
"אין לי קורסים" path. See ONBOARDING_PLAN.md §4 screen 6.

#### Acceptance criteria

- [x] Summary counts match exactly what was created during this onboarding run
- [x] Nearest-deadline line shows the earliest due date, and is hidden when no tasks exist
- [x] Mirrored motivation line matches the screen-2 selection
- [x] "אין לי קורסים" path shows the empty-state variant and still completes onboarding
- [x] `לדשבורד` sets the flag and lands on a dashboard showing the created data

#### User stories addressed

- Value preview before finishing; deferral contract for "the rest afterwards" (§4 screen 6)
- Defer the rest (§1 goal)

---

### Task 7: Post-onboarding polish (nudges + debug reset)

Status: done

- **Type**: AFK
- **Blocked by**: Task 3

#### What to build

Three small in-app follow-ups from ONBOARDING_PLAN.md §7: (a) plan-screen empty-state
card `רוצה לראות התקדמות בתואר? הוסיפו קורסים שכבר עברת 🧭` opening `CourseCatalogPicker`
when only current-semester courses exist; (b) dashboard softening — degree-progress card
shows `הוסיפו קורסים שעברת כדי לראות התקדמות` instead of `0%` when no passed courses;
(c) settings debug menu: replace `איפוס נתוני דמו` with `איפוס נתונים ואונבורדינג` →
`resetAllData()` + `resetOnboarding()` + route to `/onboarding`.

#### Acceptance criteria

- [x] Plan screen shows the backfill nudge only when no past courses exist; tapping opens the picker
- [x] Dashboard degree card shows the nudge caption instead of `0%` with no passed courses
- [x] Debug reset clears all data and the flag, and immediately re-enters onboarding
- [x] Adding a past course with a grade makes degree progress and GPA appear

#### User stories addressed

- Defer the rest — backfill nudges (§1 goal, §7)
- Reset/rerun onboarding for development (§7)
