# Simplify course & study management

**Goal:** Make adding/managing courses, tasks, materials, recordings, and exams much
easier, and make the app semester-aware — without changing the data model, the entity
relationships, or the connections between them. This is a **management/UX** rewrite, not
a schema rewrite.

## Guiding principle

The data model (`src/data/types.ts`), the collections (`src/data/store.ts`), and every
relation (Course ↔ Assignment ↔ Material, Course ↔ Exam, Course ↔ Recording) stay
**exactly as they are**. We change *how data gets in and how status is computed*, not the
shape of the data.

The only genuinely new concept is **"current semester,"** which is **derived from today's
date** — it is not stored, so it adds nothing to the schema.

---

## Decisions (confirmed with the user)

1. **Add a course = pick from a closed catalog + choose a semester.** The catalog
   auto-fills number / faculty / credits / type / level. No manual typing of those.
2. **Catalog = today's 25 seed courses**, turned into a static "catalog" list (mock, to be
   expanded later).
3. **Course status is auto-derived, never picked:**
   - has a grade → `passed` (עובר)
   - else in the current semester → `studying` (בלימוד)
   - else → `planned` (מתוכנן)
4. **Task status collapses to done / not-done** (`todo | done`). `in_progress` is removed.
   Tasks become a checkbox, not a 3-way picker.
5. **Current semester is auto-detected from the date** (Open University calendar).
6. **Current-semester focus lives on the Home dashboard** as a "this semester" section. The
   Plan tab keeps the full multi-year grouping.
7. **Scope: everything** — Courses+Plan, Tasks, Materials+Recordings, Exams.

---

## Data model impact (must stay stable)

| Entity | Change | Relations affected |
| --- | --- | --- |
| `Course` | `status` becomes **derived**, not user-set. `name/courseNumber/faculty/credits/type/level` become **catalog-owned** (read-only after creation). `year/semester/grade/notes` stay editable. | None |
| `Assignment` | `AssignmentStatus` narrows `'todo' \| 'in_progress' \| 'done'` → `'todo' \| 'done'`. | None |
| `Exam`, `Material`, `Recording` | No field changes. | None |

> `CourseStatus` type + `COURSE_STATUS_LABELS/TONES` are **kept** (still used for
> display), but `status` is now produced by a single derivation helper and the field is
> never written from a form. We keep `status` on the stored object for compatibility with
> `stats.ts` and the badges; it is always set via the helper, never by hand.

---

## New / changed building blocks

### 1. Course catalog — `src/data/catalog.ts` (new)

```ts
export interface CourseCatalogEntry {
  courseNumber: string;   // unique key, links back to Course.courseNumber
  name: string;
  faculty?: Faculty;
  credits?: number;
  type: CourseType;
  level?: CourseLevel;
}
export const COURSE_CATALOG: CourseCatalogEntry[] = [ /* the 25 seed courses, minus status/year/semester/grade */ ];
```

- Derived by hand from `seed.ts` (drop the per-enrollment fields).
- `seed.ts` can optionally be refactored to *build* its courses from the catalog + a small
  per-enrollment table, to keep one source of truth — **nice-to-have, not required**.
- Helper: `catalogEntryByNumber(courseNumber)` and `isEnrolled(courseNumber, courses)`.

### 2. Semester logic — `src/data/semester.ts` (new)

```ts
export function getCurrentSemester(now = new Date()): { year: number; term: Semester };
export function isCurrentSemester(course, current): boolean; // year === && semester ===
export function deriveCourseStatus(course, current): CourseStatus; // grade→passed, current→studying, else planned
```

- **Open University calendar mapping (ASSUMPTION — verify against the real calendar,
  see Open Questions):**
  - `א` (Autumn): Nov–Feb
  - `ב` (Spring): Mar–Jun
  - `ג` (Summer): Jul–Oct
  - Academic `year`: the calendar year the term falls in (matching how `seed.ts` labels
    `year`). **This is the one thing to confirm during implementation.**

### 3. Status derivation replaces stored status everywhere

- `stats.ts` `degreeStats` / `gpaStats`: read `deriveCourseStatus(course, current)` instead
  of `course.status`. (GPA already keys off `grade`, so it's unaffected in practice.)
- `courses/index.tsx`, `plan.tsx`, `courses/[id].tsx`, `index.tsx` badges: use derived status.

---

## Screen-by-screen changes

### Courses tab — add flow (`components/course-form-modal.tsx` → split)

**New: `CourseCatalogPicker` (replaces the manual "new course" form).**
- A searchable, checkbox list of `COURSE_CATALOG`. Already-enrolled entries are shown
  checked + disabled ("the closed list to check").
- One year+semester selector at the bottom, **defaulting to the current semester**.
- Multi-select: check several courses, pick the semester once, "add N courses" creates a
  `Course` per checked entry (static fields copied from catalog).
- After adding, still offer the existing **Quick Tasks** flow per new course (optional).

**Slimmed `CourseFormModal` (edit only).**
- Editable: **year, semester, grade, notes** only.
- Read-only (from catalog): name, number, faculty, credits, type, level.
- **Remove the status picker entirely.**

### Plan tab (`plan.tsx`)
- No structural change; keeps year→semester grouping.
- Badge uses derived status. Optionally mark the current-semester section header.

### Home dashboard (`index.tsx`)
- **New top card: "הסמסטר הנוכחי"** — lists courses where `isCurrentSemester`, each with its
  open-task count and next exam date. Empty state: "אין קורסים בסמסטר הנוכחי."
- `degreeStats` caption ("עברו / בלימוד / מתוכנן") keeps working via derived status.
- Tasks segmented bar + "TODO" list: 2 states now (done / not-done).

### Tasks (`assignments/*`, `assignment-form-modal.tsx`, `quick-tasks-modal.tsx`)
- `AssignmentStatus` → `'todo' | 'done'`; update `constants.ts` (drop `in_progress` label/tone).
- Task rows become a **tap-to-toggle checkbox** (done / not-done) instead of a status badge
  picker.
- `assignment-form-modal`: remove the status chip; new tasks default `todo`.
- `assignments/index.tsx`: filter becomes `all | todo | done`.
- `quick-tasks-modal`: unchanged flow, just no `in_progress` anywhere.
- `stats.ts` `assignmentBreakdown`: `open = todo`; drop `in_progress`.
- `seed.ts`: existing `in_progress` rows → `todo`.

### Materials (`capture.tsx`, `courses/[id].tsx`)
- Keep the inbox flow, but let "add material" **optionally pick a course inline** (chip row)
  so it can be filed immediately instead of always landing in the inbox.
- Add an "+ הוספת חומר" action to the חומרים section on the course detail screen.

### Recordings (`courses/[id].tsx`)
- Replace the read-only recordings list with a **per-course "last watched lecture" stepper**:
  `הקלטה אחרונה: #N` with `−/+` buttons that update `recordingNumber`.
- Create the `Recording` row lazily on first bump if none exists for the course.

### Exams (`exam-form-modal.tsx`)
- Keep as-is functionally; align spacing/labels with the simplified forms. Course is
  pre-filled when opened from a course; title defaults to the course name.

---

## Demo-data reanchoring (so the feature is visible)

Today's seed courses are all dated 2018–2022, so with date-based detection the
"this semester" section would be empty. **Reanchor 1–2 ungraded seed enrollments** (e.g.
the two currently marked `studying`) to the **current academic year + term** so the Home
"this semester" card and the derived `studying` status demonstrate correctly.

---

## Suggested implementation order

1. `catalog.ts` + `semester.ts` + `deriveCourseStatus` (no UI yet).
2. Swap all `course.status` reads to derived status; reanchor demo data. (App still builds.)
3. Narrow `AssignmentStatus` to `todo | done`; update constants, stats, seed, all task UI.
4. Course catalog picker + slimmed edit form.
5. Home "this semester" card.
6. Materials inline-file + course-detail add; recordings stepper.
7. Exam form polish.

Each step is independently shippable and keeps the app compiling.

---

## Open questions to confirm before/while building

1. **OU calendar boundaries** — are the month ranges above (א = Nov–Feb, ב = Mar–Jun,
   ג = Jul–Oct) and the academic-`year` labeling correct? This is the only thing that can
   make "current semester" wrong.
2. **Catalog dedup** — if a course is enrolled twice across different semesters (retake),
   should the picker allow re-adding an already-enrolled course, or hard-block it?
3. **Editing identity fields** — OK that name/number/credits/type become fully read-only
   after a course is added from the catalog (only fixable by editing the catalog)?
4. **Recordings** — is a single "last watched #" per course enough, or do you ever track
   more than one recording thread per course?
