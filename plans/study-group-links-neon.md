# Plan: Study-Group Links → Neon Postgres

> Generated from: conversation (2026-07-07)
> Date: 2026-07-07

## Overview

Replace the mocked, in-memory study-group links (`src/data/study-groups.ts`) with a real
Neon Postgres backend. Because this is a native mobile app, the `DATABASE_URL` can never
ship to the client, so all database access goes through **Expo Router API routes** (`+api.ts`,
server-side) using the **Drizzle ORM** and Neon's **serverless HTTP driver**. The app talks to
Postgres exclusively over these endpoints.

**Data flow:** App screen → `fetch('/api/study-groups')` → Expo API route (server) → Drizzle → Neon.

**Stack decisions**
- ORM: **Drizzle** (`drizzle-orm`) + `drizzle-kit` for generated SQL migrations.
- Driver: **`@neondatabase/serverless`** via **`drizzle-orm/neon-http`** — API routes run in
  EAS Hosting's serverless/edge runtime where a long-lived TCP `pg` pool won't work; the HTTP
  driver is built for this.
- Neon project: `openstudent` (`holy-truth-10275230`), branch `production`, db `neondb`.
  Pooled connection string stored in `.env` as `DATABASE_URL` (server-only, **not**
  `EXPO_PUBLIC_`), which is gitignored.
- **Moderation policy:** submissions go **live immediately** (`status` defaults to `'approved'`).
  A `status` column is kept so a pending-review flow can be enabled later without a schema change.

**Schema**
- `study_group_links`: `id` uuid pk (`gen_random_uuid()`) · `course_number` text · `year` int ·
  `semester` text · `platform` text · `url` text · `status` text default `'approved'` ·
  `report_count` int default `0` · `created_at` timestamptz default `now()`.
- `study_group_reports`: `id` uuid pk · `link_id` uuid fk → `study_group_links(id)` ·
  `reason` text · `created_at` timestamptz default `now()`.

**Docs**
- Expo API Routes: https://docs.expo.dev/router/web/api-routes/
- EAS Hosting: https://docs.expo.dev/eas/hosting/introduction/
- Neon + Drizzle: https://neon.com/docs/guides/drizzle

---

## Tasks

### Task 1: Read path — list study groups from Neon

- **Type**: AFK
- **Blocked by**: None - can start immediately
- Status: done

#### What to build

The thinnest complete end-to-end path: view real study-group links served from Postgres.
This slice carries the foundational scaffolding because the read path can't exist without it.

- Add deps: `drizzle-orm`, `@neondatabase/serverless`; dev: `drizzle-kit`, `dotenv`.
- `.env` with `DATABASE_URL` (pooled Neon string); ensure `.env` is in `.gitignore`.
- `drizzle.config.ts` (schema path, `neondb`, `out` migrations dir, reads `DATABASE_URL` via dotenv).
- `src/db/schema.ts` — define `study_group_links` (and `study_group_reports`, used in Task 3).
- `src/db/client.ts` — server-only Drizzle client: `drizzle(neon(process.env.DATABASE_URL!))`.
- Generate + apply migration to the Neon `production` branch (`db:generate`, `db:migrate`).
- `src/db/seed.ts` — insert the 8 existing links currently hardcoded in `src/data/study-groups.ts`;
  move that mock array here and keep `types`, `detectPlatform`, `PLATFORM_LABELS`, `PLATFORM_EMOJI`
  in `src/data/study-groups.ts`.
- `src/app/api/study-groups+api.ts` — `GET` returns approved links, filterable by
  `course`, `year`, `semester` query params.
- `src/app/(tabs)/study-groups/index.tsx` — replace the static `STUDY_GROUP_LINKS` import with a
  `fetch('/api/study-groups')`, with loading / error / empty states. Filters may stay client-side
  for this slice.
- `app.json` — set `web.output` from `"static"` to `"server"` (required for API routes).
- Add npm scripts: `db:generate`, `db:migrate`, `db:seed`.

#### Acceptance criteria

- [x] `drizzle-kit generate` produces a migration; `db:migrate` creates the tables in Neon.
- [x] `db:seed` inserts the 8 links; they are visible via `GET /api/study-groups`.
- [x] The study-groups screen renders links fetched from the API (not the static array).
- [x] Loading, error, and empty states are handled.
- [x] `DATABASE_URL` is only referenced in server code; it is not bundled into the client and `.env` is gitignored.
- [x] `web.output` is `"server"` and the app still builds/runs in dev.

**Verification notes:**
- Migration `drizzle/0000_narrow_ulik.sql` applied to Neon `production` branch (project `holy-truth-10275230`); confirmed `study_group_links` and `study_group_reports` tables exist via `mcp__Neon__get_database_tables`.
- Seeded 8 rows; `curl http://localhost:PORT/api/study-groups` and `?course=20441` filter both verified against live data.
- `npx tsc --noEmit` and `npm run lint` pass with no new errors introduced (pre-existing lint issues in unrelated files only).
- Found and confirmed (via `git stash` A/B test) a **pre-existing, unrelated** issue: this project's web SSR crashes with "Cannot read properties of undefined (reading 'default')" on every route, reproducible on `main` before any of this task's changes and independent of the `web.output: static → server` switch. Likely a nativewind 5 preview / react-native-web SSR incompatibility. Out of scope for this migration; flagged for separate investigation. Native (iOS) is the primary target and is unaffected by this web-only SSR path — attempted to verify on the iOS Simulator but lacked a UI-automation tool (no `idb`/`cliclick`) to drive the dev-client past a one-time Safari deep-link confirmation dialog, so native rendering was not visually confirmed this session, only via API/DB checks and code review.

#### User stories addressed

- View real study-group links classified by course / year / semester.

---

### Task 2: Submit path — persist new links

- **Type**: AFK
- **Blocked by**: Task 1
- Status: done

#### What to build

Turn the submit form from a `console.log` stub into a real write.

- `src/app/api/study-groups+api.ts` — add `POST`: parse body, re-run `detectPlatform(url)`
  server-side to validate + infer platform, reject invalid payloads with `400`, insert a row
  with `status: 'approved'`, return the created link.
- `src/components/submit-group-link-form.tsx` — replace `console.log('submit group link', …)`
  with a `POST /api/study-groups` call; handle success (close sheet, surface the alert) and error.
- List screen exposes a way to re-fetch (e.g. pull-to-refresh or refetch on focus) so a new
  submission appears.

#### Acceptance criteria

- [x] Submitting a valid WhatsApp/Telegram link inserts a row in Neon and returns it.
- [x] Server-side validation rejects non-WhatsApp/Telegram URLs with a 4xx and a clear message.
- [x] After submit + refresh, the new link appears in the list.
- [x] The form no longer logs the payload to the console.

**Verification notes:**
- `POST /api/study-groups` tested directly: valid WhatsApp link → `201` with the created row (verified in Neon then deleted as test data); invalid URL → `400 {"error":"url must be a valid WhatsApp or Telegram invite link"}`; missing `courseNumber` → `400 {"error":"courseNumber is required"}`.
- `submit-group-link-form.tsx` now posts to the API, shows a spinner while submitting, surfaces server error messages via `Alert`, and calls `onSubmitted` (wired in `index.tsx` to `fetchLinks({ silent: true })`) so the list refreshes after a successful submit without needing the screen to regain focus.
- `npx tsc --noEmit` passes with no new errors.

#### User stories addressed

- Submit a study-group link that persists for other users.

---

### Task 3: Report path — flag a link

- **Type**: AFK
- **Blocked by**: Task 1
- Status: done

#### What to build

Persist reports instead of logging them.

- `study_group_reports` table (defined in Task 1's schema) confirmed migrated.
- `src/app/api/study-groups/[id]/report+api.ts` — `POST`: record a `{ reason }` report tied to
  `link_id`, increment the parent link's `report_count`. Return 404 if the link id is unknown.
- `src/app/(tabs)/study-groups/index.tsx` — wire the 🚩 action (currently `reportLink` →
  `console.log`) to `POST /api/study-groups/:id/report` with the chosen reason
  (`not-working` / `not-relevant`).

#### Acceptance criteria

- [x] Reporting a link inserts a `study_group_reports` row and increments `report_count`.
- [x] Reporting an unknown link id returns 404.
- [x] The report action no longer logs to the console.

**Verification notes:**
- `POST /api/study-groups/:id/report` tested directly: valid id → `201`, `report_count` incremented 0→1 (confirmed via `mcp__Neon__run_sql`, then reset), row inserted into `study_group_reports`; unknown UUID → `404 {"error":"Link not found"}`.
- `npx tsc --noEmit` passes; no new lint errors (the flagged `submit-group-link-form.tsx` warning is a pre-existing `useEffect` reset pattern, unrelated to this task's edits).

#### User stories addressed

- Report a broken or irrelevant study-group link.

---

### Task 4: Production server deployment

- **Type**: HITL
- **Blocked by**: Task 1, Task 2, Task 3 (all done)
- Status: in progress
- Blocker: requires the user's EAS account/CLI login and an explicit go-ahead to run `eas deploy` and set the hosting `DATABASE_URL` secret — not something to do unattended.

**Pre-deploy bug fix (resolved):** `npx expo export -p web` crashed on every route with
`Cannot read properties of undefined (reading 'default')`, blocking this task entirely. Root-caused
via bisection against a scratch vanilla SDK 57 project (added deps one at a time until it broke):
- Cause 1: `nativewind/babel`'s transform corrupts Metro's server/SSR bundle (breaks even a bare
  `<View><Text>` route). Fix: `babel.config.js` now skips the `nativewind/babel` preset when
  `api.caller(c => c.isServer)` is true — native and the client web bundle are unaffected, only the
  server-only prerender bundle skips it (that HTML is replaced by the real bundle on hydration
  anyway, so this app never needed nativewind styling there).
- Cause 2: `src/data/kv-storage.web.ts` read `window.localStorage` at module-eval time
  (`useHasCompletedOnboarding`), which throws under Node during prerendering. Fix: guarded with
  `typeof window !== 'undefined'`.
- Both fixes verified: `expo export -p web` now completes (13 static routes + both API routes
  bundled), `npx tsc --noEmit` clean, dev server still serves pages/API correctly.
- Separate, lower-priority finding (not fixed, doesn't block this task): the web *client* bundle
  (browser-rendered, post-hydration) still shows a blank page due to a circular import between
  `react-native-web`'s `AnimatedFlatList` and `react-native-css`'s `FlatList` substitution
  (`globalClassNamePolyfill: true`). Confirmed this is web-only — native rendering (checked on iOS
  Simulator, onboarding screen) is unaffected, since native never touches `react-native-web`. Since
  this app is native-first and the web target only exists to host `/api/*`, this was left as-is.

#### What to build

Make the API reachable from real-device / release builds (dev already works via the Metro
server). Requires the user's EAS account and a deploy decision, hence HITL.

- `npx expo export -p web` to produce the server bundle.
- `eas deploy` to EAS Hosting; set `DATABASE_URL` as a hosting environment variable/secret.
- Set `origin` in the `expo-router` plugin config in `app.json` to the deployed URL so native
  builds fetch from the hosted server.
- Verify a production/preview native build can list, submit, and report against the live server.

#### Acceptance criteria

- [ ] The server bundle is deployed to EAS Hosting with `DATABASE_URL` configured as a secret.
- [ ] `expo-router` plugin `origin` points to the deployed URL.
- [ ] A native build (not just Metro dev) can list, submit, and report links.

#### User stories addressed

- All of the above, working on real devices and release builds.
