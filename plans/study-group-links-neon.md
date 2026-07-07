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

- [ ] `drizzle-kit generate` produces a migration; `db:migrate` creates the tables in Neon.
- [ ] `db:seed` inserts the 8 links; they are visible via `GET /api/study-groups`.
- [ ] The study-groups screen renders links fetched from the API (not the static array).
- [ ] Loading, error, and empty states are handled.
- [ ] `DATABASE_URL` is only referenced in server code; it is not bundled into the client and `.env` is gitignored.
- [ ] `web.output` is `"server"` and the app still builds/runs in dev.

#### User stories addressed

- View real study-group links classified by course / year / semester.

---

### Task 2: Submit path — persist new links

- **Type**: AFK
- **Blocked by**: Task 1

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

- [ ] Submitting a valid WhatsApp/Telegram link inserts a row in Neon and returns it.
- [ ] Server-side validation rejects non-WhatsApp/Telegram URLs with a 4xx and a clear message.
- [ ] After submit + refresh, the new link appears in the list.
- [ ] The form no longer logs the payload to the console.

#### User stories addressed

- Submit a study-group link that persists for other users.

---

### Task 3: Report path — flag a link

- **Type**: AFK
- **Blocked by**: Task 1

#### What to build

Persist reports instead of logging them.

- `study_group_reports` table (defined in Task 1's schema) confirmed migrated.
- `src/app/api/study-groups/[id]/report+api.ts` — `POST`: record a `{ reason }` report tied to
  `link_id`, increment the parent link's `report_count`. Return 404 if the link id is unknown.
- `src/app/(tabs)/study-groups/index.tsx` — wire the 🚩 action (currently `reportLink` →
  `console.log`) to `POST /api/study-groups/:id/report` with the chosen reason
  (`not-working` / `not-relevant`).

#### Acceptance criteria

- [ ] Reporting a link inserts a `study_group_reports` row and increments `report_count`.
- [ ] Reporting an unknown link id returns 404.
- [ ] The report action no longer logs to the console.

#### User stories addressed

- Report a broken or irrelevant study-group link.

---

### Task 4: Production server deployment

- **Type**: HITL
- **Blocked by**: Task 1, Task 2, Task 3

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
