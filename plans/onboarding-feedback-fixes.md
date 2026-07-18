# Onboarding Feedback — Fix Plan

Addresses four points of user feedback on the onboarding flow (Hebrew):

1. No way to go **back** in onboarding to edit earlier choices.
2. The tracking-goal step forces **one** choice — should allow selecting **both**
   "degree progress" and "deadlines/ממ״נים".
3. The **course-selection screen is too dark** on iPhone, even at full brightness.
4. **Missing courses** in the catalog — at least `20417 אלגוריתמים` and `אלגברה לינארית 1`.

> Scope decision (confirmed with user): point 4 adds **only the two named courses**,
> not a full core-course audit. Root cause is noted below for context.

All changes live in the onboarding state machine (`src/app/onboarding.tsx`), the shared
catalog list (`src/components/course-catalog-list.tsx`), and the catalog data
(`src/data/catalog.ts`). State is already hoisted in `OnboardingScreen`, so most of this
is additive.

---

## 1. Back navigation in onboarding (Point 1)

**Where:** `src/app/onboarding.tsx` — the flow is a `useState` step machine
(`const [step, setStep] = useState(1)`, `TOTAL_STEPS = 7`). There is currently **no**
back affordance on any screen; the only navigation is forward via `setStep(n)` /
`finish()` and the per-course loop.

**Approach:** Add a persistent back control in the header row (next to `ProgressDots`)
that decrements the step. Because every answer already lives in hoisted state
(`name`, `struggle`, `selectedCourses`, `year`, `semester`, …), going back and forward
**preserves prior selections with no extra work** — the fields simply re-render with
their existing values.

**Seams to handle explicitly** (a naive `setStep(step - 1)` is not enough):

- **Step 1** has no "back" — hide the control on the first step.
- **Step 6 (per-course loop)** is not a single step; it iterates
  `courseLoopIndex` over `createdCourses` via `advanceCourseLoop()`. Back here should
  first walk *within* the loop (`courseLoopIndex - 1`) and only return to step 5 from
  the first course. Note step 5 → 6 transition runs `finishWithCourses()`, which
  **creates Course records** in `coursesCollection`; going back from the loop to re-edit
  the course selection must reconcile/undo those additions (see risk below).
- **Step 4** is gated on `struggle`; step 6 on `createdCourses[courseLoopIndex]`.
  Decrementing into a step whose guard is false renders nothing — back targets must skip
  or satisfy these guards.
- The two **`finish()` entry points** (the "אין לי קורסים כרגע" skip on step 5 and the
  empty-selection path in `finishWithCourses`) jump straight to step 7; a back button on
  step 7 should return to step 5, not step 6, when no courses were created.

**Recommended minimal version:** a back arrow that decrements the linear steps (2→1
hidden, 3→2, 4→3, 5→4), and *within* step 6 walks `courseLoopIndex` back to 0 then to
step 5. Defer the harder "undo created courses when returning from the loop" case — see
Open risk R1.

---

## 2. Multi-select tracking goal (Point 2)

**Where:** `src/app/onboarding.tsx`, step 3 (`מה הכי מציק לך בלימודים?`).

Today `struggle` is a single value:

```ts
type StruggleKey = 'deadlines' | 'progress';
const [struggle, setStruggle] = useState<StruggleKey | null>(null);
```

`STRUGGLE_OPTIONS` already renders as a checkbox list (`TaskCheckbox`), so the UI
*looks* multi-select but behaves single-select (`handleSelectStruggle` replaces the
value). The user wants to pick **both** `deadlines` (ממ״נים/דדליינים) and `progress`
(התקדמות בתואר).

**Changes:**

- `struggle: StruggleKey | null` → `struggles: Set<StruggleKey>` (or `StruggleKey[]`).
- `handleSelectStruggle` toggles membership instead of replacing.
- Step-3 continue gate: `primaryDisabled={struggles.size === 0}`.
- **Downstream copy keyed on the single value must handle the combined case:**
  - `REFLECTION_COPY` (step 4 headline) — add a both-selected variant, or compose the
    two lines. Step-4 gate `step === 4 && struggle` → `struggles.size > 0`.
  - `SUMMARY_MIRROR_COPY` (step 7 echo) — same: render one line per selected key, or a
    combined line.
- **Analytics payload shape changes** — update these captures:
  - `onboarding_struggle_selected` currently sends `{ struggle: key }` per tap → send
    `{ struggles: [...] }` (array) on continue, or emit per-toggle with a `selected`
    boolean.
  - `onboarding_completed` sends `struggle` → change to `struggles` (array). Flag this
    to whoever owns the PostHog dashboards, since it's a property rename.

---

## 3. Course-selection screen too dark on iPhone (Point 3)

**Diagnosis (dark-mode contrast bug, not a brightness/light-mode issue):**
The app is dark-mode-by-design — `app.json` sets `"userInterfaceStyle": "automatic"`,
`_layout.tsx` maps the system scheme straight through, and `global.css` defines a full
dark palette. On a phone in dark mode the course-selection screen renders:

- page background `--background` = `rgb(10,10,10)` (near-black), and
- catalog rows (`ThemedView type="backgroundElement"`, i.e. `--secondary`) =
  `rgb(38,38,38)`.

That's dark-grey-on-near-black — very low contrast — and it's worst exactly here because
the course list is a long stack of these rows (`CourseCatalogList` in
`src/components/course-catalog-list.tsx`, rows at lines ~52–63). "Even at full
brightness" is consistent with a contrast problem, not a backlight one.

Note also that `onboarding.tsx`'s root is a plain `<View>` with **no background color**
(`styles.root`), so the screen shows whatever is behind it — reinforcing the flat, dark
look versus in-app screens that sit on themed surfaces.

**Recommended fix (stay dark, raise contrast):**

- Increase the row-vs-page separation in dark mode — either lift the row surface
  (a lighter `backgroundElement`) or add a subtle `border` (`--border` = `rgb(46,46,46)`)
  around each `styles.row` so rows read as distinct cards on the black page.
- Give the onboarding root an explicit themed background so the surface is intentional.
- Consider a hairline separator or elevated card treatment for the list container.

**Do not** force light mode — that's a product change the user didn't request.

**Verification is on-device.** The diagnosis is inferred from the palette; confirm the
before/after on a real iPhone in dark mode (and check light mode didn't regress). This
fix also benefits the in-app `CourseCatalogPicker`, which reuses `CourseCatalogList`.

---

## 4. Add the two missing courses (Point 4)

**Root cause (context):** `src/data/catalog.ts` is an **incomplete import** — every one
of the ~180 entries is typed `בחירה` or `סמינר`; there are **zero `חובה` (required)
courses**, even though `CourseType` in `src/data/types.ts` supports `'חובה'`. Core
required courses (linear algebra, algorithms, calculus, etc.) are largely absent. Per the
scope decision we add only the two named courses now; the broader gap is logged as R2.

**Verified course data** (from openu.ac.il course pages):

| # | Name | Credits | Faculty | Level |
|---|------|---------|---------|-------|
| `20417` | אלגוריתמים | 5 | מדעי המחשב | ר |
| `20109` | אלגברה לינארית 1 | 7 | מתמטיקה | ר |

- `20417` — confirmed name/credits/faculty/level on
  <https://www.openu.ac.il/courses/20417.htm?t=h>.
- `20109` — "אלגברה לינארית 1", 7 credits (was 6 through 2021ג), מתמטיקה, level ר;
  confirmed via search + <https://www.openu.ac.il/courses/20109.htm?t=h>. (The user
  said "לינארית 1"; `20109` is the standard OU course by that name.)

**Change:** add two rows to `COURSE_CATALOG`, keeping the array's existing alphabetical
ordering by Hebrew `name` (`20417 אלגוריתמים` near the top; `20109 אלגברה לינארית 1`
just after it).

**Type-field decision to confirm:** both are *required* courses, so `type: 'חובה'` is
correct — but that makes them the only `חובה` rows in an otherwise all-`בחירה` catalog.
Options: (a) type them `'חובה'` (accurate, but inconsistent with the rest), or
(b) match the catalog's existing loose `'בחירה'` convention. **Recommend (a) `'חובה'`** —
it's correct and the list UI (`CourseCatalogList`) doesn't render `type`, so nothing
breaks; the inconsistency is purely in the data and is resolved when R2 is done.

```ts
{ courseNumber: '20417', name: 'אלגוריתמים', faculty: 'מדעי המחשב', credits: 5, type: 'חובה', level: 'ר' },
{ courseNumber: '20109', name: 'אלגברה לינארית 1', faculty: 'מתמטיקה', credits: 7, type: 'חובה', level: 'ר' },
```

Search already matches on `name`/`courseNumber`, so both become findable immediately.

---

## Suggested order of work

1. **Point 4** — data-only, lowest risk, immediately shippable.
2. **Point 2** — contained to step 3 + downstream copy/analytics.
3. **Point 3** — theming; needs an on-device check.
4. **Point 1** — highest risk (the loop/course-creation seam); do last.

## Open risks / follow-ups

- **R1 — Back from the course loop (step 6→5):** `finishWithCourses()` already wrote
  Course rows to `coursesCollection`. Returning to re-edit selection needs those
  reconciled (undo, or re-sync `selectedCourses` from what was created) to avoid
  duplicates. Simplest first cut: allow back *within* the loop but not back out to
  step 5 once courses are created; revisit if the user wants full editability.
- **R2 — Catalog completeness:** the catalog has no `חובה` courses and is missing many
  core CS/Math requirements. Out of scope now (user chose "only the two named"); worth a
  separate task to audit against the OU CS program list.
- **R3 — PostHog property rename:** point 2 renames `struggle` → `struggles` on
  `onboarding_completed` / `onboarding_struggle_selected`; coordinate with dashboards.
