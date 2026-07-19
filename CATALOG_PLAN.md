# Plan: Full-catalog scrape + performant catalog serving

## 0. The number that decides everything

Before designing, the whole-catalog size was **measured**, not guessed. A dry-run
scrape over the 31 `validation.ok` combinations in `openu-codes.json`:

| Metric | Value |
| --- | --- |
| Combos scraped | 31 |
| Pages fetched | 192 |
| Rows (with cross-combo dupes) | 1,800 |
| **Distinct course numbers** | **1,103** |

**1,103 courses (~110–250 KB of data) is small.** This is the single most important
input to the design:

- 1,103 entries (~110–250 KB) is small enough to **live inside the API route itself** as
  a hardcoded/imported JSON asset — no database table, no seed migration.
- Because the JSON is imported **server-side** (`+api.ts` runs in a sandboxed environment
  isolated from the client bundle), the catalog **never ships to the client**, keeping the
  app bundle lean. This is the chosen architecture (see Part B).
- Server-side pagination + filtering at this size is a **deliberate pattern choice**, not a
  performance necessity. That's a fine call — keep the page size generous so it stays cheap
  and scales for free if the catalog ever grows.
- Trade-off to own consciously: the full catalog no longer lives in client memory, so
  `catalogEntryByNumber` (currently synchronous) and the **offline onboarding first-run**
  both need explicit handling. See Part D — this is the real cost of going server-side.
- Independent of all the above: `course-catalog-list.tsx` renders every filtered row in a
  `ScrollView`. That must be virtualized regardless. See Part C.

This plan has three workstreams: **(A)** extend the scraper, **(B)** serve it from an Expo
API Route with react-query, **(C)** fix rendering. They can land separately.

---

## Part A — Extend `scripts/scrape-catalog.mjs` to all combos

### A.1 Iterate the code combinations

Replace the hard-coded `PARAMS.sitecode/sitetype/departmentcode` with a loop over the
valid candidates from `openu-codes.json`:

```js
const codes = JSON.parse(await readFile(resolve(__dirname, '../openu-codes.json'), 'utf8'));
const combinations = codes.candidates
  .filter(({ validation }) => validation.ok)   // 31 of 37
  .map(({ sitecode, sitetype, departmentcode }) => ({ sitecode, sitetype, departmentcode }));
```

- Parametrize `buildUrl(combo, page)` — the constant `PARAMS` becomes per-combo
  (`sitecode`, `sitetype`, `departmentcode` from the combo; the rest stay fixed).
- `fetchAllCourses(combo)` keeps the existing "increment `page` until empty" logic.
- Fetch combos **sequentially** (be a good citizen to the OpenU endpoint; 192 pages is
  fine serially, ~seconds). Log progress per combo.
- Carry `departmentcode`/`sitecode` onto each row before dedup so we can attribute a
  course to its department (see A.3 faculty).

### A.2 Global dedup + merge policy (the non-obvious part)

The same `courseNumber` appears in multiple combos (1,800 rows → 1,103 distinct = ~700
duplicates). The current script's `seen` Set just keeps the first and drops the rest —
but across departments the "first" is arbitrary. Define an explicit **merge policy**:

- Key by normalized `courseNumber` (existing `normalizeCourseNumber`).
- On collision, **merge fields, preferring non-empty values**: keep the first non-empty
  `name`, `credits`, `level`; **union** the `faculty` arrays across combos (dedup, stable
  sort — Decision 3: a course can legitimately belong to more than one department, and all
  of them are kept, not just one primary).
- Keep the merge deterministic (sort combos before processing) so re-runs produce stable
  diffs.

### A.3 Faculty must widen — this is a schema change, not a scraper detail

`mapFaculty` only recognizes `'מדעי המחשב'` / `'מתמטיקה'` and returns `undefined`
otherwise. `Faculty` in `src/data/types.ts` is a **2-value union**. With all departments
(sociology, arts, history, economics, psychology, …) this is wrong for ~half the catalog.

**Decided** (see Decisions section): widen `Faculty` to `string`, and
`CourseCatalogEntry.faculty` becomes `string[]` (all departments a course is cross-listed
under — Decision 3, not a single primary faculty). This ripples to:

- `src/data/types.ts` — `Faculty` type becomes `string`; `Course.faculty` stays a single
  `Faculty` (the course as enrolled belongs to one degree context); `CourseCatalogEntry.faculty`
  becomes `Faculty[]`.
- `mapFaculty` — return **all** subject strings scraped for a course (`subjectsField[].teurField`
  mapped/deduped), not the CS/Math special-case.
- Any code that **compares** faculty to a literal (grep `'מדעי המחשב'` / `'מתמטיקה'`) or
  renders it must handle an array now (e.g. `entry.faculty.join(' · ')`, `entry.faculty.includes(x)`).
- Owning this widening is part of Part A's scope; the scraper cannot be "finished"
  without it.

### A.4 `type: 'חובה'` is not scrapable — set expectations

`CourseType` is `'חובה' | 'בחירה' | 'סמינר'`. **"חובה" (required) is degree-specific**,
not an intrinsic property of a course — a course required for the CS degree is elective
for another. The endpoint does not carry it. The scraper can only distinguish:

- `'סמינר'` via the existing `isSeminar` heuristic,
- `'בחירה'` as the default for everything else.

So the scraped catalog is a **course-identity table** (number, name, credits, level,
subjects/faculty, department). Whatever marks a course as חובה for a given degree must
live elsewhere (a per-degree requirements map), not the scrape. Document this in the
script header so nobody expects חובה to come from it.

### A.5 Output target

The current script rewrites the `COURSE_CATALOG` array literal inside
`src/data/catalog.ts` via regex. New target: **write
`src/app/api/catalog.generated.json`** (1,103 entries), a plain JSON file colocated with
the API route that imports it. This drops the fragile regex-rewrite of a TS literal.

- The route imports it with a **static** `import catalog from './catalog.generated.json'`
  (see Part B — static import is fine; dynamic `import()` is not supported in API routes).
- Nothing imports this JSON from client code, so it stays out of the app bundle.
- Regenerating the catalog = re-run `npm run scrape:catalog` + redeploy the server (the
  route reads the file at build/deploy time). Catalog changes ~once per semester, so this
  cadence is fine.

---

## Part B — Serve from an Expo API Route + react-query

**Chosen approach:** an Expo Router API Route hardcodes the scraped catalog server-side and
does pagination + filtering there; the client consumes it with react-query. No database.

### B.1 The route: `src/app/api/catalog+api.ts`

```ts
import catalog from './catalog.generated.json'; // static import — server-only, 1,103 rows

export function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? '50'));
  const faculty = url.searchParams.get('faculty') ?? undefined;

  let items = catalog;
  if (q) items = items.filter((c) => c.name.includes(q) || c.courseNumber.includes(q));
  if (faculty) items = items.filter((c) => c.faculty.includes(faculty)); // faculty: string[] (Decision 3)

  const total = items.length;
  const start = (page - 1) * pageSize;
  const rows = items.slice(start, start + pageSize);
  return Response.json({ rows, page, pageSize, total, hasMore: start + pageSize < total });
}
```

Facts this relies on (from the Expo v57 API-routes docs):

- **File naming:** `+api.ts`, no platform-specific extension. Handlers are named exports
  `GET`/`POST`/… Query params come from `new URL(request.url).searchParams`; return
  `Response.json(...)`.
- **Server output required:** `app.json` must set `web.output: "server"` and deploy to a
  server (EAS Hosting — already in use per `src/db/client.ts`). API routes do **not** run
  on static hosting.
- **Sandboxed / server-only:** `+api.ts` is isolated from the client bundle, so the
  imported catalog JSON never reaches the app bundle. (Same property that keeps secrets
  safe.)
- **Gotchas:** no dynamic `import()`; code transpiles to CommonJS. A **static** JSON import
  is fine — **verify** it bundles correctly in EAS Hosting during a smoke test (if the
  bundler balks, `readFile` the JSON at request time as a fallback).

Also add a single-lookup path for resolving `courseNumber → entry` without downloading the
world (used by Part D): either a dynamic route `src/app/api/catalog/[courseNumber]+api.ts`
or a `?ids=` batch param on the same route.

### B.2 The client: react-query

- Add `@tanstack/react-query` (v5; **pin + verify** against React 19.2 / RN 0.86 at install)
  and a `QueryClientProvider` in `src/app/_layout.tsx` (none today).
- Catalog list/search → `useInfiniteQuery(['catalog', q, faculty])`, `getNextPageParam`
  from the response's `hasMore`/`page`. Debounce `q` (`useDeferredValue` or a timer) so the
  server search fires per settled keystroke, not per character.
- Single lookups → `useQuery(['catalog-entry', courseNumber])` hitting the lookup path,
  with a long `staleTime` (catalog is effectively static within a session).
- Give the whole catalog a long `staleTime`/`gcTime`; optionally persist the query cache so
  repeat launches don't re-fetch.

### B.3 Consequences to accept (the cost of server-side)

- **Autocomplete is a network round-trip** (debounced). At 1,103 rows the response is tiny
  and fast, but it is online-only — no results without connectivity.
- **The client never holds the full catalog**, so synchronous `catalogEntryByNumber` can no
  longer read from memory. Every call-site must move to the async lookup query **or** to
  denormalized data. This is the main migration — enumerated in Part D.
- **Onboarding becomes network-dependent.** Its course-selection step now needs the search
  endpoint. See Part D for how to keep first-run acceptable (loading/empty/offline states,
  and whether a tiny bundled fallback is worth it).

---

## Part C — Rendering: virtualize the list (needed no matter what)

This is independent of Parts A/B and is a real runtime cost today.

- `src/components/course-catalog-list.tsx:45` maps every entry into a `ScrollView`. Fine at
  184 rows, janky at 1,103.
- Replace the `ScrollView` + `.map()` with a virtualized list (`FlatList`, or `FlashList`
  if adopted). Only visible rows mount.
- With server pagination (Part B), the list's `data` is the accumulated pages from
  `useInfiniteQuery`; wire `onEndReached` → `fetchNextPage`.
- `study-group-course-filter.tsx` routes through `SelectModal`/`SelectSource` — confirm
  that modal's internal list is also virtualized; if it renders all `items`, fix it there
  too, and switch its source to the paginated query.

---

## Part D — Lookup migration (enumerated call-sites)

Going server-side means the client no longer holds the full catalog, so the **synchronous**
`catalogEntryByNumber` cannot read from memory anymore. This is the highest-risk part of
the change; every call-site must be handled.

Call-sites (resolving `courseNumber → entry`, all currently synchronous):

| Call-site | Use | After (server-side) |
| --- | --- | --- |
| `src/app/onboarding.tsx:143` | resolve selected entry on continue | **No lookup needed** — the entry is already in hand from the search result the user tapped; carry the full entry into local state at selection (the `Course` store already stores name/faculty/…). |
| `src/components/course-catalog-picker.tsx:56` | `catalogEntryByNumber(courseNumber)!` | Same — capture the entry at selection time instead of re-resolving by number. |
| `src/app/(tabs)/study-groups/index.tsx:183` | `courseNumber → name` for display | **Denormalize** `courseName` onto the study-group link (required now); fall back to the async lookup query only for legacy rows. |
| `src/components/study-group-course-filter.tsx` | `SelectSource` over full array | Source becomes the paginated `/api/catalog` query (Part C). |
| `src/components/course-catalog-list.tsx` | `COURSE_CATALOG` + filter + `isEnrolled` | Data from `useInfiniteQuery`; `isEnrolled` stays a local check against the `Course` store. |

Key facts that de-risk this:

- **Enrolled courses are self-contained.** The local `Course` store already copies
  `name/faculty/credits/type/level` (`types.ts` `Course`), so rendering a user's enrolled
  courses **never needs the catalog** at render time. Only *discovery* and *lookup-by-bare-
  number* paths touch it — and discovery already has the entry in the search result.
- **Capture-at-selection kills most lookups.** The picker and onboarding resolve by number
  only because the array was free to query. When the source is a search result, the tapped
  row *is* the entry — store it directly and the async lookup disappears for those paths.
- **Denormalize name onto study-group links (now required).** `study-groups/index.tsx:183`
  resolves a name from a stored `courseNumber`. Store `courseName` on the link row
  (`studyGroupLinks` schema + the `POST` handler) so the feature doesn't depend on catalog
  availability. The `?ids=`/`[courseNumber]` lookup route (B.1) covers pre-existing rows.
- **Onboarding is the hard constraint.** Its course-selection step is now network-dependent.
  Minimum bar: proper loading/empty/error/offline states so first-run never shows a broken
  blank screen. **Decided (see Decisions above):** ship a tiny bundled fallback list (e.g.
  the current ~184 CS/Math entries) so onboarding works fully offline as a fallback when the
  live query fails or there's no network.

---

## Part E — react-query + autocomplete wiring

- Add `@tanstack/react-query` v5 — **pin + verify** against React 19.2 / RN 0.86 at install.
- Add a `QueryClientProvider` at `src/app/_layout.tsx` (none today). Set generous defaults
  (`staleTime`, `gcTime`) since the catalog is effectively static within a session;
  optionally persist the cache.
- Build a thin client (`src/data/catalog-api.ts`): `fetchCatalogPage({ q, faculty, page })`
  and `fetchCatalogEntry(courseNumber)` calling the routes in B.1.
- **Autocomplete** = debounced/`useDeferredValue` query string → `useInfiniteQuery` keyed by
  `[q, faculty]` → virtualized results (Part C). One settled server request per query, not
  per keystroke.

---

## Part F — Schema / type changes summary

- `src/data/types.ts`: widen `Faculty` to `string` (Part A.3); `CourseCatalogEntry.faculty`
  becomes `string[]` (Decision 3); consider adding `departmentcode?: string[]` alongside.
- `src/data/catalog.ts`: `COURSE_CATALOG` and the synchronous `catalogEntryByNumber` shrink
  to the small bundled onboarding-fallback list (Decision 2) — no longer the primary data
  source. Add the API-client helpers (Part E). `isEnrolled` stays (local `Course` check, no
  catalog needed).
- `src/db/schema.ts`: add `courseName` to `studyGroupLinks` (denormalization). No `courses`
  table — the catalog lives in the route's JSON, not the DB.
- New artifact: `src/app/api/catalog.generated.json` (server-side, out of the app bundle).

---

## Sequencing / checklist

1. [ ] **Part C** — virtualize `course-catalog-list` (and `SelectModal`). Independent win;
       can land before the data move.
2. [ ] **Part A** — extend scraper: loop combos, parametrize `buildUrl`, global dedup +
       merge policy, widen `Faculty`, document חובה/type limits, emit
       `src/app/api/catalog.generated.json`. Re-run `npm run scrape:catalog`; expect ~1,103.
3. [ ] **Part B.1** — add `catalog+api.ts` (paginated + filtered) and the lookup route.
       **Smoke-test the static JSON import on EAS Hosting** before building on it.
4. [ ] **Part E** — add react-query + `QueryClientProvider` + API client.
5. [ ] **Part D** — migrate call-sites: capture-at-selection in picker/onboarding; switch
       list/filter sources to the paginated query; add onboarding loading/offline states.
6. [ ] Denormalize `courseName` onto study-group links (schema + `POST` + display + backfill
       via lookup route for legacy rows).

---

## Decisions (recorded 2026-07-18, via Task 2 of the execution plan)

1. **`Faculty` widening — DECIDED: widen to `string`.** `Faculty` changes from the 2-value
   union to `string` (the scraped subject name). Ripples to `Course`, `CourseCatalogEntry`,
   `mapFaculty`, and any literal comparisons (grep `'מדעי המחשב'` / `'מתמטיקה'`).
2. **Offline onboarding — DECIDED: ship a small bundled fallback list.** Bundle a small
   offline course list (e.g. the current ~184 CS/Math entries, generated alongside
   `catalog.generated.json` by the scraper as a client-safe subset) so the first-run picker
   works with no network. Onboarding still prefers the live paginated query when online;
   the bundled list is the offline/error fallback only. Task 6 owns keeping this fallback
   roughly in sync (regenerated by the same `npm run scrape:catalog` run) and must not let it
   silently drift into the primary data path.
3. **Faculty attribution on multi-department courses — DECIDED: array of departments.**
   `CourseCatalogEntry.faculty` becomes `string[]` (all departments/subjects a course is
   cross-listed under), not a single primary string. This changes the shape described in
   Part A.3/B.1 below:
   - **Merge policy (A.2):** on collision, **union** the faculty arrays across combos
     (dedup, stable sort) instead of "keep first non-empty."
   - **API filter (B.1):** the `faculty` query param matches courses whose `faculty` array
     **includes** the given value (`c.faculty.includes(faculty)`), not strict equality.
   - **Display call-sites** (catalog list/picker/onboarding rows, study-group filter) show
     `entry.faculty.join(' · ')` or similar instead of a bare string.
   - **`studyGroupLinks.courseName` (Task 8)** is unaffected — it denormalizes only the
     course name, not faculty.

---

## Known limitation: department-page discovery is not fully exhaustive (found 2026-07-18)

Running the extended scraper against the live endpoint (31 combos, 1,103 deduped entries —
matches the Part 0 measurement exactly) revealed it is **missing at least 2 courses** that
were in the old hand-curated `COURSE_CATALOG`: `20109` (אלגברה לינארית 1 / Linear Algebra 1)
and `20417` (אלגוריתמים / Algorithms) — both core mandatory first-year CS courses. Neither
appears under any of the 31 validated `sitecode`/`sitetype`/`departmentcode` combos, on any
page. A course-detail page found in `courses-scrape.html` references `20109` via
`yed.daf_kurs?mid=321`, and `321` is not among the 31 combos — evidence that department-page
discovery (the mechanism `openu-codes.json` was built from) may have structural blind spots
for some foundational/cross-departmental courses, not just these two specifically. Coverage
for the ~919 non-curated courses is unmeasured, so a similar gap there is possible but
unconfirmed.

**Decision (recorded 2026-07-18):** accept and document the gap. `catalog.generated.json`
stays scraper-only (31 combos, no union with the curated list). Consequence: once Tasks 5–7
move the picker/onboarding/study-group search to the live server catalog, **online users
searching the live catalog will not find these courses** — a regression from today's app for
at least Algorithms and Linear Algebra 1. The bundled offline-fallback list from Decision 2
still contains them, but per that decision it's an offline/error fallback only, not a
general parallel search source, so it does not close this gap for online users.
If this proves painful in practice, the fix is to union the curated list into the scraper's
output (same merge policy as combo dedup) — revisit if it comes up again.

---

## Constraints / notes

- **`AGENTS.md` mandate:** verify against the Expo **v57** docs
  (https://docs.expo.dev/versions/v57.0.0/ and the API-routes page) before writing code —
  especially the static-JSON-import behavior and `web.output: "server"` requirement.
- **API routes need server output + a deployed server** (EAS Hosting, already in use). They
  do not run on static web hosting. No dynamic `import()`; code transpiles to CommonJS.
- The catalog route needs **no database**. The existing Neon/Drizzle setup is only touched
  to add `courseName` to `studyGroupLinks`.
- Measurement script used for the count lives in scratch; the real multi-combo logic
  becomes the extended `scrape-catalog.mjs`.
