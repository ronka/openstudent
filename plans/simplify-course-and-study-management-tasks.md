# Plan: Simplify course & study management

> Generated from: plans/simplify-course-and-study-management.md (design doc)
> Date: 2026-07-02

## Overview

Make adding and managing courses, tasks, materials, recordings, and exams much easier, and
make the app semester-aware — **without changing the data model, entities, or relations**.
This is a management/UX rewrite: how data gets in, and how status is computed. The only new
concept, "current semester," is derived from today's date, so it adds nothing to the schema.
See the design doc for full rationale and confirmed decisions.

---

## Tasks

### Task 1: Semester logic + derived course status

- **Type**: HITL
- **Blocked by**: None — but needs the Open University calendar boundaries confirmed before merge

#### What to build

Introduce `src/data/semester.ts` with `getCurrentSemester(now)`, `isCurrentSemester(course, current)`,
and `deriveCourseStatus(course, current)` (grade → `passed`, current semester → `studying`,
else → `planned`). Replace every read of `course.status` (`stats.ts`, `courses/index.tsx`,
`plan.tsx`, `courses/[id].tsx`, `index.tsx`) with the derived value; the stored `status`
field stays for compatibility but is never set from a form. Reanchor 1–2 ungraded seed
enrollments to the current academic year+term so derived `studying` and the (later) "this
semester" card are demonstrable.

The **HITL** part: confirm the month→semester mapping and academic-`year` labeling
(assumption: א = Nov–Feb, ב = Mar–Jun, ג = Jul–Oct) against the real OU calendar before merge.

#### Acceptance criteria

- [x] `semester.ts` exports `getCurrentSemester`, `isCurrentSemester`, `deriveCourseStatus`
- [x] All course-status badges/stats compute from `deriveCourseStatus`, not stored `status`
- [x] `CourseStatus` type + `COURSE_STATUS_LABELS/TONES` unchanged and still used for display
- [x] OU calendar mapping confirmed with the user and documented in `semester.ts`
- [x] Demo data shows at least one `studying` course in the current term
- [x] App builds; no manual status picker is required for correct badges

Status: done

#### User stories addressed

- Decision 3 (auto-derived course status)
- Decision 5 (current semester from date)

---

### Task 2: Tasks become done / not-done

- **Type**: AFK
- **Blocked by**: None

#### What to build

Narrow `AssignmentStatus` from `'todo' | 'in_progress' | 'done'` to `'todo' | 'done'`. Update
`constants.ts` (drop `in_progress` label/tone), `stats.ts` `assignmentBreakdown`
(`open = todo`, remove `in_progress`), and `seed.ts` (`in_progress` rows → `todo`). Replace
the 3-way status picker with a **tap-to-toggle checkbox** everywhere tasks render:
`assignment-form-modal` (remove status chip; new tasks default `todo`), `assignments/index.tsx`
(filter `all | todo | done`, list rows toggle), `assignments/[id].tsx`, `courses/[id].tsx`,
and the Home dashboard tasks card + segmented bar.

#### Acceptance criteria

- [x] `AssignmentStatus = 'todo' | 'done'`; no `in_progress` references remain in the repo
- [x] Task rows toggle done/not-done with a tap (no status dropdown)
- [x] New tasks default to `todo`; quick-tasks flow still works
- [x] Dashboard segmented bar + "open tasks" stat reflect 2 states correctly
- [x] `assignments` list filter is `all | todo | done`
- [x] App builds and existing seed tasks migrate cleanly

Status: done

#### User stories addressed

- Decision 4 (task status → done/not-done)

---

### Task 3: Course catalog picker + slimmed edit form

- **Type**: AFK
- **Blocked by**: None (created courses pick up derived status once Task 1 lands)

#### What to build

Add `src/data/catalog.ts` exporting `COURSE_CATALOG` (the 25 current seed courses stripped of
per-enrollment fields) plus `catalogEntryByNumber` / `isEnrolled` helpers. Replace the manual
"new course" form with a **catalog picker**: a searchable checkbox list where already-enrolled
entries are checked+disabled, a single year+semester selector defaulting to the current
semester, and multi-add that creates one `Course` per checked entry (static fields copied from
the catalog). Keep the post-create Quick Tasks offer. Slim `CourseFormModal` (edit mode) to
**year, semester, grade, notes only** — name/number/faculty/credits/type/level become read-only,
and the status picker is removed.

#### Acceptance criteria

- [x] `catalog.ts` holds all 25 catalog entries keyed by `courseNumber`
- [x] Adding a course = check one or more catalog entries + pick a semester → courses created
- [x] Already-enrolled catalog entries appear checked/disabled in the picker
- [x] New-course semester defaults to the current semester
- [x] Edit form exposes only year/semester/grade/notes; identity fields read-only; no status picker
- [x] Quick Tasks flow still launches after course creation
- [x] Course relations (assignments/exams/materials/recordings) unaffected

Status: done

#### User stories addressed

- Decision 1 (catalog pick + semester)
- Decision 2 (catalog = current 25 seed courses)

---

### Task 4: Home "this semester" card

- **Type**: AFK
- **Blocked by**: Task 1

#### What to build

Add a top card on the Home dashboard (`index.tsx`) titled "הסמסטר הנוכחי" listing courses where
`isCurrentSemester`, each showing its open-task count and next exam date, linking to the course.
Empty state: "אין קורסים בסמסטר הנוכחי." The existing degree/GPA/tasks/exams cards stay.

#### Acceptance criteria

- [x] Home shows a "this semester" card driven by `isCurrentSemester`
- [x] Each row shows open-task count + next exam date and links to the course
- [x] Sensible empty state when no course is in the current term
- [x] Plan tab still shows the full multi-year grouping (unchanged)

Status: done

#### User stories addressed

- Decision 6 (current-semester focus on Home)

---

### Task 5: Materials capture

- **Type**: AFK
- **Blocked by**: None

#### What to build

On the capture screen (`capture.tsx`), let "add material" **optionally pick a course inline**
(chip row) so it can be filed immediately instead of always landing in the inbox; keep the
inbox + file-to-course flow for unfiled items. Add an "+ הוספת חומר" action to the חומרים
section on the course detail screen (`courses/[id].tsx`) that creates a material already filed
to that course.

#### Acceptance criteria

- [x] Adding a material can target a course inline (or stay unfiled → inbox)
- [x] Course detail has an "add material" action that files to that course
- [x] Existing inbox → file-to-course flow still works
- [x] Material relations (assignmentIds/tags/createdAt) preserved

Status: done

#### User stories addressed

- Scope (Materials + Recordings)

---

### Task 6: Recordings stepper

- **Type**: AFK
- **Blocked by**: None

#### What to build

Replace the read-only recordings list on the course detail screen with a per-course
"last watched lecture" stepper: `הקלטה אחרונה: #N` with `−/+` controls that update
`recordingNumber`. Lazily create the `Recording` row on first bump when none exists for the
course.

#### Acceptance criteria

- [x] Course detail shows a `−/+` stepper for the last-watched recording number
- [x] Bumping when no recording exists creates one lazily
- [x] Number never goes below a sensible floor (e.g. 0/1)
- [x] Home "recordings" card reflects updated numbers

Status: done

#### User stories addressed

- Scope (Materials + Recordings)

---

### Task 7: Exam form polish

- **Type**: AFK
- **Blocked by**: None

#### What to build

Align `exam-form-modal.tsx` with the simplified forms: when opened from a course, prefill the
course and default the title to the course name; tidy spacing/labels. No behavioral change to
the exam data model.

#### Acceptance criteria

- [x] Opening the exam form from a course prefills course + title
- [x] Form styling/labels match the other simplified sheets
- [x] Exam create/edit/delete still work; grade optional

Status: done

#### User stories addressed

- Scope (Exams)

---

## Open questions (carry-over from design doc)

1. **OU calendar boundaries** — resolve as part of Task 1 (HITL gate).
2. **Retake dedup** — may a course be enrolled twice across semesters, or hard-block re-adding?
3. **Read-only identity fields** — OK that catalog-owned fields are uneditable after add?
4. **Recordings** — is one "last watched #" per course always enough?
