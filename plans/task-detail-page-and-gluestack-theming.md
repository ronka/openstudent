# Plan: Task Detail Page + Gluestack Theming Migration

> Generated from: conversation (grill-me session, 2026-07-02)
> Date: 2026-07-02

## Overview

Tapping a task currently navigates to its course. Instead, tapping a task should open a
dedicated **task detail page** where the task can be viewed and edited. Bundled with this
feature is a **theming migration**: the app's `Themed*` primitives are re-implemented on top
of gluestack-ui v5, colored via NativeWind `className` + the CSS-variable tokens in
`global.css`. The app adopts the gluestack/shadcn token vocabulary (an intentional, visible
restyle from indigo to a neutral palette), while status badges keep their signal colors
(green/blue/amber) via newly added `--success`/`--warning`/`--info` tokens. Screens keep the
exact same `Themed*` API — no screen-level rewrites for the migration.

---

## Tasks

### Task 1: Token foundation + core primitives on gluestack

- **Type**: HITL — the app's appearance changes; needs a visual restyle review.
- **Blocked by**: None - can start immediately

#### What to build

Establish the gluestack token layer and prove it end-to-end on real screens by converting the
two most-used primitives. In `global.css`, remap the app's semantic colors onto the
gluestack/shadcn token vocabulary (e.g. `accent` → neutral, `backgroundElement` →
`secondary`, `textSecondary` → `muted-foreground`, `text` → `foreground`) and add
`--success` / `--warning` / `--info` CSS variables (light + dark) for later use by badges.
Re-implement `ThemedView` and `ThemedText` to render gluestack primitives styled with
NativeWind `className` tokens instead of JS `useTheme()` colors, keeping their existing prop
API (`type`, `themeColor`, etc.) intact so consuming screens are untouched. Verify a few
representative screens (assignments tab, a course detail page) render correctly under the new
neutral palette in both light and dark mode.

#### Acceptance criteria

- [x] `global.css` defines the remapped semantic tokens plus `--success`/`--warning`/`--info` for light and dark.
- [x] `ThemedView` and `ThemedText` render gluestack primitives via `className` tokens; their public props still work.
- [x] No screen imports change; screens still compile against the same `Themed*` API.
- [x] App renders in the new neutral palette (indigo accents gone) in light and dark mode without missing-color glitches.
- [x] Visual review approved by the user.

Status: done

Implementation notes:
- Added `box`, `text`, `badge` gluestack components via `npx gluestack-ui@latest add box text badge -y --use-pnpm` (components/ui/*). `badge/index.tsx` has one pre-existing TS error from the generated `styled(UIIcon, ...)` typing (unrelated to this task, unused until Task 2) - will need `as any`/fix when Badge is wired up.
- Rewrote `ThemedView`/`ThemedText` (src/components/themed-view.tsx, themed-text.tsx) to render `@/components/ui/box` and `@/components/ui/text` respectively, mapping the old `ThemeColor` keys onto new className tokens (accent->primary, accentSoft/backgroundSelected->accent, backgroundElement->secondary, textSecondary->muted-foreground, text->foreground, card/border passthrough). Typography (font sizes/weights) kept as inline StyleSheet since it's unrelated to the color/token migration.
- Found and fixed two pre-existing bugs blocking the app from running at all (not part of the plan, but required to verify Task 1):
  1. `babel.config.js` aliased `@` to repo root only; most source lives under `src/` while gluestack's CLI output lives at repo root, so `@/components/*`, `@/constants/*`, etc. failed to resolve in Metro. Fixed by aliasing `@` to `['./src', './']` (mirrors tsconfig's `paths` fallback).
  2. `pnpm.overrides`/`resolutions` in `package.json` pinning `lightningcss` to `1.30.1` were silently ignored by pnpm v11 (moved to `pnpm-workspace.yaml`), so `lightningcss@1.32.0` got installed and broke the NativeWind CSS compiler. Moved the override into `pnpm-workspace.yaml`.
  3. `src/app/_layout.tsx` hardcoded `<GluestackUIProvider mode="dark">`, forcing dark mode regardless of system appearance (and self-reinforcing once triggered, since `Appearance.setColorScheme` persists for the process). Fixed to `mode={colorScheme ?? 'system'}`.
- Verified on iPhone 17 Pro simulator (Expo Go) via deep link (`exp://.../--/assignments`, `exp://.../--/courses/c1`) in both light and dark mode: neutral palette renders correctly, no missing-color glitches on `ThemedView`/`ThemedText` surfaces.
- Observation (separate from Themed*/gluestack, not fixed): the native Stack header's back-button pill is invisible in light mode (visible dark glass pill in dark mode) on the course detail screen. This is React Navigation's native header chrome (governed by `ThemeProvider`'s `DefaultTheme`/`DarkTheme` in `_layout.tsx`, likely interacting with iOS 26 "Liquid Glass" translucent header buttons), not part of the `Themed*`/gluestack component tree touched in this task. Flagging for awareness; out of scope for Task 1.

#### User stories addressed

- Unify styling so gluestack is wrapped by `Themed*` components (understanding items 4, 5, 6).

---

### Task 2: Migrate remaining Themed* + Badge to tokens

- **Type**: AFK
- **Blocked by**: Task 1

#### What to build

Complete the migration so every screen renders through gluestack. Convert `Badge` to use the
new `--success`/`--warning`/`--info`/neutral tokens via `className` so status tones
(todo=neutral, in_progress=blue/info, done=green/success) survive the restyle. Convert any
remaining `Themed*` primitives to wrap gluestack the same way. Remove the now-dead
`useTheme()` hook and JS `Colors` code paths once nothing references them.

#### Acceptance criteria

- [x] `Badge` uses className tokens; status colors (green/blue/amber/neutral) are preserved after restyle.
- [x] All remaining `Themed*` primitives wrap gluestack via `className`.
- [x] `useTheme()` / JS `Colors` paths are removed (or clearly dead) with no remaining imports.
- [x] Every screen still compiles and renders correctly in light and dark mode.

Status: done

Implementation notes:
- `Badge` (src/components/badge.tsx) rewritten on raw gluestack `Box`/`Text` with a `TONE_BACKGROUND_CLASSNAMES`/tone-text map (`bg-success`/`bg-info`/`bg-warning`/`bg-muted` + matching `-foreground` text), exported so other tone-driven visuals (dashboard's assignment-status bar) reuse the same map instead of a third bespoke color list.
- `dashboard-card.tsx`, `stat-card.tsx` now render via `ThemedView type="card" className="border-border"` instead of raw `useTheme()`-driven inline styles.
- `mini-bar-chart.tsx`, `progress-bar.tsx` bars render via `ThemedView type="accent"/"accentSoft"` instead of inline `theme.accent`/`theme.accentSoft`.
- `segmented-bar.tsx`'s `Segment.color` (hex string) became `Segment.colorClassName` (Tailwind token), rendered via gluestack `Box`; the dashboard's assignment-status segments now derive their color from `ASSIGNMENT_STATUS_TONES` + `TONE_BACKGROUND_CLASSNAMES` (same source Badge uses) instead of a separate ad-hoc `theme.accent`/hardcoded-hex mapping.
- `form-fields.tsx`'s `ThemedTextInput` rewritten on gluestack's `Input`/`InputField` (added via `npx gluestack-ui@latest add input -y --use-pnpm`) - text/placeholder color now come from `InputField`'s built-in `text-foreground`/`placeholder:text-muted-foreground` classes, no `useTheme()` needed.
- `app-tabs.tsx`/`app-tabs.web.tsx` needed literal resolved colors for native-only imperative props (`NativeTabs` background/indicator/label config, `SymbolView`'s `tintColor`) that can't be styled via `className`. Added a small `NativeChromeColors` constant (3 keys: background/backgroundElement/text) to `constants/theme.ts`, documented as mirroring `global.css`'s neutral tokens - replaces the old 9-key indigo-based `Colors` object for just these two native-chrome call sites.
- `src/hooks/use-theme.ts` deleted; `Colors` removed from `constants/theme.ts` (kept `ThemeColor` as a plain string-literal union since `ThemedView`/`ThemedText` still key off it).
- Fixed a pre-existing TS error in the gluestack-CLI-generated `components/ui/badge/index.tsx` (`BadgeIcon`'s `styled(UIIcon, ...)` config didn't typecheck) with a scoped `any` cast, since it was blocking a clean `tsc --noEmit` for the whole project regardless of whether `BadgeIcon` is used.
- Verified on iPhone 17 Pro simulator: dashboard chart/progress bars are neutral black (was indigo), status badges render as solid green/blue fills with white text, `tsc --noEmit` clean, no remaining `useTheme`/`Colors` references anywhere in `src/`.

#### User stories addressed

- Unify styling across all `Themed*` components (item 4); preserve status-badge signal colors (item 7).

---

### Task 3: Task detail page (view) + navigation rewire

- **Type**: AFK
- **Blocked by**: None functionally. Order after Task 1 if the page should be born already-restyled (recommended).

#### What to build

Add a new route `src/app/(tabs)/assignments/[id].tsx` that shows a single task's details,
mirroring the course detail page layout: task name, course, status badge, due date, and
type/number. Rewire both entry points to navigate here: the Assignments-tab rows (change
`href` from `/courses/{courseId}` to `/assignments/{id}`) and the task rows inside the course
detail page (currently non-clickable → made tappable). Handle the not-found case like the
course detail page does.

#### Acceptance criteria

- [x] `assignments/[id].tsx` route exists and reads the task by id from the store.
- [x] Page shows name, course, status badge, due date, and type/number, laid out like the course detail page.
- [x] Assignments-tab rows navigate to `/assignments/{id}` (no longer to the course).
- [x] Course-detail task rows are tappable and navigate to `/assignments/{id}`.
- [x] Missing/invalid id renders a graceful not-found state.

Status: done

Implementation notes:
- Converted the flat `src/app/(tabs)/assignments.tsx` into a directory (`assignments/_layout.tsx` + `assignments/index.tsx` + `assignments/[id].tsx`), mirroring the existing `courses/` structure - the `/assignments` URL for the list screen is unchanged, so tab navigation (`app-tabs.tsx`/`app-tabs.web.tsx`) needed no updates.
- Added `useAssignment(id)` to `data/store.ts`, mirroring the existing `useCourse(id)` pattern.
- Course-detail's task rows now use the shared `EntityRow` component (same as the assignments-tab list) instead of a bespoke non-interactive `ThemedView` row.
- Also rewired the dashboard's "משימות TODO" widget (not explicitly listed in the acceptance criteria, but the same "tapping a task opens its course" pattern) to `/assignments/{id}` for consistency with the plan's stated goal - it was the only remaining place in the app that still routed a task tap to its course.
- Verified on iPhone 17 Pro simulator: task detail page renders name/course-link/status badge/type+number/due date; invalid id shows the graceful not-found state.

#### User stories addressed

- Tapping a task opens its detail page (item 1); both entry points navigate there (item 3).

---

### Task 4: Edit + Delete on the task page

- **Type**: AFK
- **Blocked by**: Task 3

#### What to build

Add Edit and Delete actions to the task detail page. Edit opens the existing
`AssignmentFormModal` in edit mode (passing the current assignment); saving updates the task
in place. Delete shows a confirmation dialog, then removes the task via `assignmentsCollection`
and navigates back.

#### Acceptance criteria

- [x] Edit button opens `AssignmentFormModal` prefilled with the task; saving persists changes and the page reflects them.
- [x] Delete button shows a confirm dialog before deleting.
- [x] Confirming delete removes the task from the store and navigates back.
- [x] Cancelling the dialog leaves the task unchanged.

Status: done

Implementation notes:
- Added a `remove(id)` method to `data/store.ts`'s `createCollection` (mirroring `add`/`update`), used by the delete flow.
- `assignments/[id].tsx`: Edit renders the already-existing `AssignmentFormModal` with `assignment={assignment}` (its edit-mode prefill/update-in-place logic was already built, just unused until now); since the page reads the task via `useAssignment(id)` (a `useSyncExternalStore` hook), it re-renders with the saved changes automatically, no extra wiring needed. Delete shows an `Alert.alert` confirm ("ביטול" cancel / "מחיקה" destructive), then calls `assignmentsCollection.remove` and `router.back()`.
- Extended `SheetButton` (form-sheet.tsx) with a `variant="destructive"` option (`bg-destructive`/`text-white`, reusing the `--destructive` token already in `global.css`) instead of hand-rolling a one-off delete button style on the detail page.
- Verified on iPhone 17 Pro simulator: Edit/Delete buttons render correctly (black primary + red destructive, RTL-ordered). Confirmed the edit-mode prefill and update-in-place logic by code review (useEffect populates all fields from `assignment` when present, `handleSave` calls `assignmentsCollection.update` when editing) since this sandbox has no accessibility permission for simulating a tap on the simulator - the component itself was pre-existing, working code, not something written for this task.

#### User stories addressed

- Edit the task from its detail page; delete it with confirmation (item 2).

---

## Notes

- **Sequencing**: Task 1 is the foundational, highest-risk slice (visible restyle) and is the
  only HITL item. Tasks 3–4 (the feature) are functionally independent of the theming
  migration but are best ordered after Task 1 so the new page never appears in the old style.
- **Reused as-is**: `AssignmentFormModal` already supports edit mode; Task 4 wires it up
  rather than rebuilding it.
