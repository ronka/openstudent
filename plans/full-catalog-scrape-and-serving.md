# Plan: Full-catalog scrape + Expo API Route serving

> Generated from: CATALOG_PLAN.md (conversation)
> Date: 2026-07-18

## Overview

Extend the Open University catalog scraper from the single hard-coded CS/Math department to
all 31 valid `sitecode`/`sitetype`/`departmentcode` combinations in `openu-codes.json`
(measured: **1,103 distinct courses**). Rather than bundling that data in the app, serve it
from an Expo Router API Route (`+api.ts`) that imports the scraped JSON server-side and does
pagination + filtering; the client consumes it with react-query. This keeps the catalog out
of the app bundle and gives search/autocomplete a scalable server-backed source. The main
costs are moving the currently-synchronous `catalogEntryByNumber` lookups to an async/
capture-at-selection model and making onboarding tolerant of a network-backed catalog.

Reference: see `CATALOG_PLAN.md` at repo root for the full design (Parts A–F), the
measurement, and the API-route doc facts. This file is the task breakdown.

---

## Tasks

### Task 1: Virtualize the catalog list

- **Type**: AFK
- **Blocked by**: None - can start immediately
- Status: done

#### What to build

Replace the `ScrollView` + `.map()` rendering in `src/components/course-catalog-list.tsx`
(currently mapping every filtered entry) with a virtualized `FlatList` (or `FlashList` if
adopted). Keep it fed by the existing static `COURSE_CATALOG` and the existing debounced
`useMemo` filter — this slice changes **only** rendering, no data source. It ships value
immediately and de-risks the later server migration (Task 5). See `CATALOG_PLAN.md` Part C.

#### Acceptance criteria

- [x] `course-catalog-list.tsx` renders rows through a virtualized list; only visible rows mount
- [x] Search box still filters; empty state ("לא נמצאו קורסים") preserved
- [x] Already-enrolled rows still render checked + disabled (existing `isEnrolled` behavior)
- [x] RTL layout/styles unchanged (row direction, text alignment)
- [x] Multi-select toggle behavior unchanged in both host contexts (modal picker + onboarding)

#### User stories addressed

- Browse/search the course catalog without UI jank as it grows

---

### Task 2: Decisions gate (Faculty type, offline onboarding, faculty attribution)

- **Type**: HITL
- **Blocked by**: None - can start immediately
- Status: done
- Decisions (recorded 2026-07-18 in `CATALOG_PLAN.md`): (1) widen `Faculty` to `string`;
  (2) ship a small bundled offline-fallback course list for onboarding; (3) store faculty
  attribution as an array of departments (`CourseCatalogEntry.faculty: string[]`), not a
  single primary — this changes the merge policy (A.2) and the API `faculty` filter (B.1)
  from equality to `includes()`.

#### What to build

Resolve the three open questions from `CATALOG_PLAN.md` before downstream code hard-codes an
answer. No production code ships in this task — the output is a recorded decision (and, if
useful, a type/interface stub) that Tasks 3 and 6 depend on.

1. **Faculty widening**: change `Faculty` in `src/data/types.ts` from the 2-value union
   (`'מתמטיקה' | 'מדעי המחשב'`) to `string`? Ripples to `Course`, `CourseCatalogEntry`, and
   any code comparing faculty to a literal.
2. **Offline onboarding**: ship a small bundled fallback list (e.g. the current ~184 CS/Math
   entries) so the first-run picker works with no network, or accept online-only onboarding?
3. **Multi-department attribution**: when a course appears under multiple departments, store a
   single primary faculty or an array of departments? Affects the scraper merge policy
   (Task 3) and the `faculty` filter (Task 4).

#### Acceptance criteria

- [x] Decision 1 recorded; `Faculty` type direction agreed (and stubbed if changing)
- [x] Decision 2 recorded; onboarding offline strategy chosen
- [x] Decision 3 recorded; faculty attribution shape chosen
- [x] Decisions captured in `CATALOG_PLAN.md` (or an ADR) so Tasks 3/6 can proceed unambiguously

#### User stories addressed

- Correct faculty/department data across all departments
- Predictable first-run onboarding experience

---

### Task 3: Extend the scraper to all combos → `catalog.generated.json`

- **Type**: AFK
- **Blocked by**: Task 2
- Status: done
- Ran against the live OpenU endpoint: 31 combos, 1,103 deduped entries (matches the
  CATALOG_PLAN measurement exactly). Verified idempotent via two independent live runs
  (byte-identical output). `Faculty` widened to `string`, `CourseCatalogEntry.faculty`
  changed to `Faculty[]` (Decision 3) — updated the bundled `COURSE_CATALOG` literal and
  the three direct consumers (`course-catalog-list.tsx` display, `course-catalog-picker.tsx`
  and `onboarding.tsx` capture-at-selection, which use `entry.faculty[0]` as the primary)
  to keep `tsc` green. `npx tsc --noEmit` clean on `src/`.

#### What to build

Extend `scripts/scrape-catalog.mjs` to iterate every `validation.ok` combination in
`openu-codes.json` (load the file, filter, map to `{ sitecode, sitetype, departmentcode }`).
Parametrize `buildUrl`/`PARAMS` per combo; fetch combos sequentially with per-combo progress.
Dedup globally by normalized `courseNumber` with an explicit merge policy (prefer non-empty
`name`/`credits`/`level`; union department/faculty attribution per Task 2's decision). Widen
faculty output accordingly. Document in the script header that `type: 'חובה'` is degree-
specific and not scrapable (only `'סמינר'` vs default `'בחירה'`). Change the output target
from rewriting the `COURSE_CATALOG` TS literal to writing `src/app/api/catalog.generated.json`.
See `CATALOG_PLAN.md` Part A.

#### Acceptance criteria

- [x] `npm run scrape:catalog` iterates all 31 valid combos (no hard-coded 307)
- [x] Output is `src/app/api/catalog.generated.json` with ~1,103 deduped entries
- [x] Merge policy is deterministic (stable re-run diffs); non-empty fields preferred on collision
- [x] Faculty populated per Task 2 decision for non-CS/Math departments
- [x] Script header documents the חובה/`type` limitation
- [x] Re-running the script is idempotent given the same upstream data

#### User stories addressed

- Full-catalog coverage across all Open University departments

---

### Task 4: Catalog API route (pagination + filtering + lookup)

- **Type**: AFK
- **Blocked by**: Task 3
- Status: done
- Verified Expo v57 API-route facts against current docs before writing code (static
  top-level imports bundle fine and stay server-only; no dynamic `import()`;
  `web.output: "server"`). Added `src/app/api/catalog+api.ts`: `GET` supports
  `q`/`faculty`/`page`/`pageSize` (capped at 100) and an `ids=` batch param for lookup
  (chose the query-param form over a separate `[courseNumber]+api.ts` route — one file,
  one JSON import). Locally verified via `npx expo export --platform web` +
  `npx expo serve` against the real exported server bundle (not just `tsc`): pagination,
  faculty filter, `ids=` lookup with present/absent ids, and pageSize capping all
  returned correct real HTTP 200 responses. Confirmed via byte-grep that the client web
  bundle contains only the 184 `COURSE_CATALOG` rows and none of the 1,103
  `catalog.generated.json` rows — the big file does not leak client-side. **Caveat:**
  this is the strongest verification possible without an actual deploy; the literal EAS
  Hosting smoke test from the acceptance criteria still needs a deploy, which is a
  separate confirm-before-acting step, not something to run autonomously.
- **Also found and documented** (see `CATALOG_PLAN.md` "Known limitation" section, user
  decision recorded 2026-07-18): the 31-combo scrape is missing at least 2 core courses
  (20109, 20417) present in the old curated list; user chose to accept-and-document
  rather than union the curated list in. This means Tasks 5-7's migration to the live
  catalog will not surface these two courses online — flagged again in Task 6.

#### What to build

Add `src/app/api/catalog+api.ts` exporting `GET`, statically importing
`./catalog.generated.json` (server-side, out of the client bundle). Support query params
`q` (name/number contains), `faculty`, `page`, `pageSize` (capped), returning
`{ rows, page, pageSize, total, hasMore }`. Add a single-lookup path — either a dynamic route
`src/app/api/catalog/[courseNumber]+api.ts` or an `?ids=` batch param on the same route — for
resolving `courseNumber → entry`. Confirm `app.json` has `web.output: "server"`. Smoke-test
the **static JSON import** on EAS Hosting (CommonJS runtime, no dynamic `import()`); if the
bundler balks, fall back to `readFile` at request time. See `CATALOG_PLAN.md` Part B.1.

#### Acceptance criteria

- [x] `GET /api/catalog?q=&page=&pageSize=&faculty=` returns the paginated/filtered shape
- [x] `pageSize` is capped; `page` defaults sanely; empty `q` returns full paginated list
- [x] Lookup route resolves one/several `courseNumber`s to entries
- [x] Static JSON import verified to bundle + run — locally via `expo export` + `expo serve`
      against the real server bundle (EAS Hosting itself not deployed; see status note)
- [x] Catalog JSON confirmed absent from the client bundle
- [x] `web.output: "server"` present in `app.json` (already set)

#### User stories addressed

- Server-backed catalog search that scales and stays off-device

---

### Task 5: react-query foundation + migrate catalog list to the server

- **Type**: AFK
- **Blocked by**: Task 1, Task 4
- Status: done
- Implemented together with Task 6 in one pass: `course-catalog-list.tsx` is the shared
  component behind both the picker and onboarding, so rewiring it to server data (Task 5)
  and fixing the picker/onboarding capture-at-selection (Task 6) had to land atomically
  to avoid a broken intermediate state (selecting a non-bundled course would otherwise
  crash on `catalogEntryByNumber(...)!` returning undefined).
- `@tanstack/react-query@^5.101.2` installed (confirmed React 19 support since 5.52+;
  `react-native: '*'` peer throughout). `QueryClientProvider` added in `_layout.tsx`
  (`staleTime` 1h, `gcTime` 24h — catalog is ~static per session). `src/data/catalog-api.ts`
  added (`fetchCatalogPage`, `fetchCatalogEntries`/`fetchCatalogEntry`).
  `course-catalog-list.tsx` rewired to `useInfiniteQuery(['catalog', debouncedQuery])`
  (300ms debounce timer, not `useDeferredValue`, for a real settled-request guarantee),
  `onEndReached` → `fetchNextPage`, loading/error/empty states (matches the existing
  `study-groups/index.tsx` loading→error→list pattern). `COURSE_CATALOG` import removed
  from this component.
- **Verification:** `tsc`/lint clean. The API layer was verified earlier (Task 4, real
  HTTP via `expo export`+`expo serve`) and is unaffected by this component-level change.
  **UI itself was not runtime-verified end-to-end**: attempted `expo start --web` +
  browser automation, but hit a crash (`react-native-web`/`react-native-css` `FlatList`
  export interop) — confirmed via `git stash` that this crash is **pre-existing on
  unmodified `main`**, unrelated to this work. A native simulator build was not
  attempted (no dev client installed for this bundle id; a cold native build was judged
  out of proportion to this session). Logic was verified by reading/reasoning + tsc, not
  by driving the actual screen.

#### What to build

The flagship end-to-end tracer bullet. Add `@tanstack/react-query` v5 (pin + verify against
React 19.2 / RN 0.86), a `QueryClientProvider` in `src/app/_layout.tsx` with generous
`staleTime`/`gcTime`, and a thin client `src/data/catalog-api.ts`
(`fetchCatalogPage`, `fetchCatalogEntry`). Rewire the already-virtualized
`course-catalog-list.tsx` to `useInfiniteQuery(['catalog', q, faculty])`, debounced query
(`useDeferredValue`/timer), `getNextPageParam` from `hasMore`, and `onEndReached` →
`fetchNextPage`. Remove the component's dependency on the in-memory `COURSE_CATALOG` array.
See `CATALOG_PLAN.md` Parts B.2 + E.

#### Acceptance criteria

- [x] `QueryClientProvider` wraps the app in `_layout.tsx`; react-query v5 pinned/verified
- [x] `catalog-api.ts` client calls the routes from Task 4
- [x] Catalog list loads page 1, appends pages on scroll, and filters via the server `q`
      (implemented; not runtime-driven in a live screen — see status note)
- [x] One settled server request per query (debounced), not per keystroke
- [x] Loading + empty + error states render (no broken blank list)
- [x] Enrolled-state check still works (local `Course` store, no catalog dependency)

#### User stories addressed

- Fast, paginated, network-backed catalog search in the primary catalog surface

---

### Task 6: Migrate picker + onboarding to the server source

- **Type**: AFK
- **Blocked by**: Task 2, Task 5
- Status: done (implemented together with Task 5 — see that task's status note for why)
- `course-catalog-picker.tsx` and `onboarding.tsx` both switched their selection state
  from `Set<string>` (courseNumbers, re-resolved later via `catalogEntryByNumber(...)!`)
  to `Map<string, CourseCatalogEntry>` — the tapped row's full entry is captured directly
  in `toggle`/`toggleCourse`, and `handleAdd`/`finishWithCourses` iterate
  `selected.values()` with no lookup. A derived `Set<string>` of the map's keys is passed
  to `CourseCatalogList`'s `selected` prop (only used for the checked-state comparison).
  `catalogEntryByNumber` import removed from both files; `COURSE_CATALOG` import removed
  from the picker, kept in onboarding only as the offline fallback.
- Onboarding passes `fallbackEntries={COURSE_CATALOG}` to `CourseCatalogList`; the picker
  does not (Decision 2 scoped the bundled fallback to onboarding/first-run specifically,
  not the general in-app add-course picker). Hardened the fallback trigger with
  `networkMode: 'always'` + `retry: 1` on the query (see Task 5 note) so it fires
  reliably on a real fetch failure rather than depending on react-query's own
  online/offline detection, which could otherwise leave the query silently "paused"
  (no data, no error) if this app ever wires up NetInfo — silently breaking Decision 2.
- **Known gap carried from Task 4:** the two courses missing from the 31-combo scrape
  (20109, 20417) are still in the onboarding fallback list (since it's the old
  `COURSE_CATALOG`) but will not appear in the picker's or onboarding's *online* search
  results, per the accept-and-document decision.
- **Verification:** `tsc`/lint clean; no remaining `catalogEntryByNumber` calls on these
  paths (grepped). **Not runtime-verified** for the same reason as Task 5 (pre-existing
  web-target crash, no native build attempted) — in particular, the *offline* fallback
  path (airplane-mode onboarding) was reasoned through via `networkMode`/`retry` but
  never exercised live.

#### What to build

Move `src/components/course-catalog-picker.tsx` and the onboarding course-selection step
(`src/app/onboarding.tsx`) off the synchronous `catalogEntryByNumber` to the paginated query.
Use **capture-at-selection**: the tapped search-result row *is* the entry, so store it
directly into local state (the `Course` store already keeps name/faculty/credits/…) instead of
re-resolving by number. Add onboarding loading/empty/error/offline states, plus the bundled
fallback list if Task 2 chose that path. See `CATALOG_PLAN.md` Part D.

#### Acceptance criteria

- [x] Picker and onboarding source courses from the paginated query (no `catalogEntryByNumber` calls)
- [x] Selecting a course captures the full entry at tap time; enrolling stores it locally
- [x] Onboarding shows proper loading/empty/error states; never a broken blank first-run
- [x] Offline onboarding behaves per Task 2 decision (bundled fallback) — implemented,
      not live-verified (see status note)
- [x] No remaining `catalogEntryByNumber(...)!` non-null assertions on these paths

#### User stories addressed

- Add courses from the full catalog during onboarding and in-app
- Reliable first-run experience

---

### Task 7: Migrate study-group course filter (SelectModal) to the server source

- **Type**: AFK
- **Blocked by**: Task 5
- Status: done
- `SelectModal` (`select-modal.tsx`) is shared with `course-select-modal.tsx` (enrolled
  courses, a small local `Course[]` array — must stay untouched/synchronous). Rather than
  duplicate the modal, added an opt-in `async?: AsyncSelectSource` prop: when present,
  `items` is treated as already-filtered by an outside paginated source and the modal
  reports its search text upward via `onQueryChange` instead of filtering locally via
  `matches`. Absent (the `course-select-modal.tsx` case) it behaves exactly as before.
  Also swapped the internal `ScrollView`+`.map()` for a `FlatList` (the "confirm/fix
  virtualization" acceptance criterion) — benefits both consumers.
- `study-group-course-filter.tsx` now sources from `useInfiniteQuery(['catalog',
  debouncedQuery])` (same query key/shape as Task 5's `course-catalog-list.tsx`, so
  react-query's cache is shared between the two surfaces) via a small internal
  `useCatalogSelectSource()` hook, wired into `SelectField`/`SelectFilterChip`'s new
  `async` prop. `COURSE_CATALOG` import removed.
- **Trigger-label subtlety:** the field/chip needs to show the *already-selected*
  course's name even when it's not in the current search page (e.g. the modal is
  closed, or the user searched something else afterward). Added a `selectedItem?: T`
  override prop to `SelectField`/`SelectFilterChip` and resolve it via
  `useQuery(['catalog-entry', courseNumber])` + `fetchCatalogEntry` (Task 4's `ids=`
  lookup route) — matches the single-lookup pattern `CATALOG_PLAN.md` Part B.2 called for.
- **Verification:** `tsc`/lint clean on all touched files, including the untouched
  synchronous consumer (`course-select-modal.tsx`, `exam-form-modal.tsx`,
  `assignment-form-modal.tsx`). **Not runtime-verified** — same web/native testing
  limitation as Tasks 5–6.

#### What to build

Point `src/components/study-group-course-filter.tsx`'s `SelectSource` at the paginated
`/api/catalog` query instead of the in-memory `COURSE_CATALOG` array, and confirm the
underlying `SelectModal` list is virtualized (fix it there if it renders all `items`). Covers
both the `CatalogSelectField` (submission) and `CatalogFilterChip` (discovery) entry points.
See `CATALOG_PLAN.md` Parts C + D.

#### Acceptance criteria

- [x] Study-group course selection/filter works for any catalog course via the server query
- [x] `SelectModal`'s internal list is virtualized
- [x] Search inside the modal uses the server `q` (debounced), not an in-memory scan
- [x] `COURSE_CATALOG` import removed from `study-group-course-filter.tsx`

#### User stories addressed

- Discover and submit study groups for any course, not just enrolled ones

---

### Task 8: Denormalize `courseName` onto study-group links

- **Type**: AFK
- **Blocked by**: Task 4
- Status: done
- Migration applied (`npm run db:migrate`) and backfill run (`npm run db:backfill-course-names`)
  against the real database with explicit go-ahead. Result: 1 existing row backfilled, 0
  unresolved; verified directly by querying the table afterward — `courseName` populated.
- Code complete: `studyGroupLinks.courseName` (nullable `text`) added to
  `src/db/schema.ts`; migration generated locally (safe, schema-diff only, doesn't touch
  the DB) at `drizzle/0001_lethal_lady_ursula.sql` (`ALTER TABLE ... ADD COLUMN
  "course_name" text` — additive, no data loss risk) but **not applied**.
  `POST /api/study-groups` now resolves and persists `courseName` at write time via a
  new `findCatalogEntry` helper. `study-groups/index.tsx` reads `item.courseName ??
  item.courseNumber` at render — no more `catalogEntryByNumber` call in that file.
  `StudyGroupLink` type updated. A backfill script for existing rows is ready at
  `src/db/backfill-course-names.ts` (`npm run db:backfill-course-names`) — resolves each
  null-`courseName` row via the catalog, leaves genuinely unresolvable rows (e.g. the
  Task 4 known-gap courses 20109/20417, which the existing `src/db/seed.ts` fixtures
  happen to reference) alone; display already falls back to the number for those.
- **Refactor note:** initially added a shared `_catalog.ts` helper inside
  `src/app/api/` to avoid duplicating the JSON import between `catalog+api.ts` and
  `study-groups+api.ts`. Caught via `expo export` that Expo Router routes *every* file
  under `src/app/` regardless of an underscore prefix — it appeared as a real (broken)
  page at `/api/_catalog`. Moved the helper to `src/data/catalog-server.ts` instead;
  re-verified via `expo export` that route count returned to normal and the client
  bundle still contains none of the 1,103-row catalog (only the small bundled fallback).
- **To finish this task:** run `npm run db:migrate` against the real `DATABASE_URL`,
  then `npm run db:backfill-course-names`, then flip this to done.

#### What to build

Add a `courseName` column to `studyGroupLinks` (`src/db/schema.ts`), write it in the `POST`
handler (`src/app/api/study-groups+api.ts`), and read it in the study-groups display
(`src/app/(tabs)/study-groups/index.tsx:183`) instead of resolving via `catalogEntryByNumber`.
Backfill existing rows using the lookup route from Task 4. This makes the study-groups feature
independent of catalog availability. See `CATALOG_PLAN.md` Part D. Can run in parallel with
Tasks 5–7.

#### Acceptance criteria

- [x] `studyGroupLinks` has `courseName`; migration applied (`npm run db:migrate`, ran clean)
- [x] `POST /api/study-groups` persists `courseName` (resolved server-side at write time)
- [x] Study-groups list renders the stored `courseName`, no `catalogEntryByNumber` at render
- [x] Existing rows backfilled (1 row, 0 unresolved); legacy rows fall back gracefully
- [x] Display still degrades to the course number if a name is somehow missing

#### User stories addressed

- Study-group listings show course names without depending on the live catalog

---

## Dependency summary

- **Start immediately (parallel):** Task 1, Task 2
- **After decisions:** Task 3 (needs Task 2) → Task 4 → Task 5 (also needs Task 1)
- **After the flagship (Task 5):** Task 6 (also needs Task 2), Task 7
- **After the API route (Task 4):** Task 8 (parallelizable with 5–7)

## Run status (2026-07-18 execute-plan pass)

All 8 tasks done. Task 8's DB migration and backfill were run with your explicit
go-ahead (1 existing row backfilled, 0 unresolved).

**Not runtime-verified in a live app screen** (Tasks 5–7): a pre-existing, unrelated
`react-native-web`/`react-native-css` `FlatList` bundling crash blocks `expo start --web`
(confirmed via `git stash` that it reproduces on unmodified `main`); no native simulator
build was attempted (no dev client installed for this bundle id, judged out of proportion
to this session). Verified instead via `tsc`, lint, and — for the API/data layer — real
HTTP requests against the actual exported server bundle (`expo export` + `expo serve`).
Recommend an `expo run:ios`/`run:android` smoke pass (search, select, add course; and
airplane-mode onboarding specifically, to exercise the Decision-2 fallback path) before
shipping.

**Also surfaced and decided along the way** (see `CATALOG_PLAN.md` for full detail):
the 31-combo scrape is missing at least 2 core courses (20109 אלגברה לינארית 1, 20417
אלגוריתמים) that the old curated list had — accepted and documented rather than fixed,
per your choice.
