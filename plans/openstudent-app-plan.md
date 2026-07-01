# Plan: OpenStudent — App Plan

> Generated from: PLAN.md
> Date: 2026-07-01
> Status: All 10 tasks done

## Overview

OpenStudent is a Hebrew, right-to-left (RTL) React Native / Expo (v57) study organizer
for an Open University CS degree, ported from a Notion template. Everything revolves around
a central `courses` catalog, with linked assignments (ממן/ממח), exams, lecture recordings,
and study materials, plus a Dashboard of "what's happening now", a year→semester Study Plan
view, a quick-capture inbox, a Pomodoro timer, and a Settings/debug screen. v1 uses an
in-memory seed store (no backend); the store is shaped so SQLite can slot in later. The
codebase is a fresh Expo Router 57 starter (NativeTabs Home/Explore placeholders) — nothing
of the app itself exists yet.

The work is sliced as one foundational walking-skeleton task (Task 1) that establishes RTL,
the typed data model, the seed store, and the real tab shell, followed by nine thin,
independent, parallel-able per-screen slices that all reuse that spine.

---

## Tasks

### Task 1: Foundation — RTL, data model, seed store & Courses list

- **Type**: AFK
- **Blocked by**: None - can start immediately
- **Status**: done

#### What to build

The walking skeleton that every other slice hangs off. Force the app into Hebrew/RTL
(`I18nManager.forceRTL`/`allowRTL`), using the `/rtl-layout` skill for all directional
styling. Define TypeScript types and centralized enum constants for all six entities in
§2 (courses, assignments, exams, recordings, materials — statuses, types, levels,
semesters, faculties as fixed vocabularies per §5). Build `src/data/seed.ts` as a plain-TS
in-memory store populated from the Notion export (§4 sample data), plus a read hook/selector
layer shaped so SQLite/AsyncStorage can replace it later without model changes. Replace the
starter Home/Explore `NativeTabs` with the real RTL bottom tabs from §3 (remaining tabs may
be placeholders at this point). Prove the full path end-to-end by rendering the **Courses
list** screen (`courses/index`) from seed data with RTL layout.

Language is Hebrew-only/RTL (open question #3 resolved — no i18n layer in v1).

#### Acceptance criteria

- [x] App launches forced into RTL with Hebrew UI; layouts mirror correctly via `/rtl-layout` utilities
- [x] TS types exist for all 6 entities with relations (§2); enums centralized as constants (§5)
- [x] `src/data/seed.ts` holds the §4 sample data; a read hook/selector exposes it; store shape is SQLite-ready
- [x] Starter Home/Explore tabs replaced with the real §3 bottom tab set (placeholders allowed for unbuilt screens)
- [x] Courses list screen renders real course records from seed with name, number, faculty, credits, status badge

#### User stories addressed

- Track courses in a central catalog (Core concept, §1, §2.1)
- View list of all courses (§3 Courses)

---

### Task 2: Course detail

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `courses/[id]` detail screen reached by tapping a course in the list. Shows the course
header (name, number, faculty, credits, type, level, status, grade, notes) and tabs/sections
for that course's related **assignments, exams, recordings, and materials** (the back-link
relations in §2.1), each read from the seed store filtered by `courseId`.

#### Acceptance criteria

- [x] Tapping a course navigates to `courses/[id]`
- [x] Header shows course fields from §2.1
- [x] Per-course tabs/sections list that course's assignments, exams, recordings, and materials
- [x] Empty states render for courses with no related records
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Drill into a course to see its assignments/exams/recordings/materials (§1, §3 Courses)

---

### Task 3: Dashboard (home)

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The home screen (`index`) surfacing live, filtered sections over the seed store, mirroring
the Notion dashboard (§3): קורסים בלימוד (active courses, `status = studying`), משימות TODO
(open assignments), מבחנים קרבים (upcoming exams, date-sorted), מעקב הקלטות (recordings
tracker), and יומן מטלות (recent assignments). Section rows link into the relevant detail
screens where they exist.

#### Acceptance criteria

- [x] Dashboard shows all five live sections derived from seed data with correct filters/sorts
- [x] Upcoming exams are sorted by date; active courses filtered to `status = studying`
- [x] Rows navigate to the corresponding course/assignment/exam detail where available
- [x] Sections show empty states when no data
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- See "what's happening now" at a glance (§1 Dashboard, §3)

---

### Task 4: Assignments screen

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `assignments` screen listing all assignments across courses (§2.2), showing name,
linked course, status (לעשות/בתהליך/נגמר), and due date, with filtering by status and by
course. Rows link to the owning course detail.

#### Acceptance criteria

- [x] All assignments from seed render with name, course, status badge, due date
- [x] Filter controls by status and by course work against the seed store
- [x] Rows navigate to the owning course
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Track ממן/ממח homework with due dates & status (§1, §2.2, §3 Assignments)

---

### Task 5: Exams screen

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `exams` screen presenting exam dates and grades (§2.3) as a date-sorted list/calendar,
showing title, linked course, date, and grade (empty until graded). Rows link to the owning
course.

#### Acceptance criteria

- [x] All exams render sorted by date with title, course, date, and grade (blank when ungraded)
- [x] Past vs upcoming exams are visually distinguishable
- [x] Rows navigate to the owning course
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Track exam dates and grades (§1, §2.3, §3 Exams)

---

### Task 6: Materials screen

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `materials` screen: a resource library over §2.5 showing name, optional linked course,
optional linked assignment(s), tags, and created date, with filtering by tag and by course.

#### Acceptance criteria

- [x] All materials render with name, course, tags, created date
- [x] Filter by tag and by course work against the seed store
- [x] Material-to-course and material-to-assignment links are shown/navigable
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Keep articles/videos/notes/links as study materials (§1, §2.5, §3 Materials)

---

### Task 7: Study Plan screen

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `plan` screen: a grouped/sorted **view** over the same `courses` records (no separate
table — §2.6), showing every course regardless of `status`, grouped by `year` then
`semester`, forming the multi-year degree roadmap. Reuses the course row/selectors from
Task 1.

#### Acceptance criteria

- [x] All courses (all statuses) render grouped by year → semester
- [x] Groups are ordered chronologically; planned/studying/passed states are visible
- [x] No duplicated data — reads the same `courses` records as the Courses list
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- See the full multi-year degree roadmap (§1 Study Plan, §2.6, §3 Study Plan)

---

### Task 8: Quick-capture inbox

- **Type**: AFK
- **Blocked by**: Task 1, Task 4, Task 6
- **Status**: done

#### What to build

A modal (the ➕ tab/action in §3) to quickly add a task or material. Per resolved open
question #6, the inbox is a **separate "unfiled" bucket**: captured items land unfiled and
can be filed to a course later. Extend the seed store to support unfiled assignments/materials
and surface the inbox as its own list, from which an item can be assigned to a course.

#### Acceptance criteria

- [x] ➕ opens a modal to add either a task or a material
- [x] New items are saved to the store as unfiled (no `courseId`)
- [x] An inbox list shows unfiled items; each can be filed to a course (sets `courseId`)
- [x] Filed items disappear from the inbox and appear under their course
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Quick-capture a task/material from the phone to file later (§1 Quick-capture, §3)

---

### Task 9: Pomodoro timer

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `pomodoro` screen with a **real built-in 25-minute Pomodoro timer** (open question #5
resolved), alongside brief how-to instructions. Timer supports start/pause/reset and signals
completion of a focus interval.

#### Acceptance criteria

- [x] A working 25-min timer with start / pause / reset
- [x] Timer counts down and clearly signals when the interval completes
- [x] Short how-to text accompanies the timer
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Use a Pomodoro timer to study (§3 Pomodoro, §5)

---

### Task 10: Settings + version & debug menu

- **Type**: AFK
- **Blocked by**: Task 1
- **Status**: done

#### What to build

The `settings` screen built with the `/app-version-debug` skill (§5): a two-part version
display (semver from `app.json` + an OTA `UPDATE_VERSION` counter), a hidden debug menu
revealed by triple-tapping the version label, and the vendored version-bump scripts wired up
(`scripts/bump-app-version.js`, `scripts/increment-update-version.js`) plus matching
`package.json` build/update scripts.

#### Acceptance criteria

- [x] Settings screen shows semver (from `app.json`) + `UPDATE_VERSION` counter
- [x] Triple-tapping the version label reveals a hidden debug menu
- [x] Version-bump scripts exist in `scripts/` and are wired into `package.json`
- [x] RTL layout via `/rtl-layout`

#### User stories addressed

- Display app version and access a hidden debug menu (§3 Settings, §5)
