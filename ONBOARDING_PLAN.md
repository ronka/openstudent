# App Onboarding Plan

Design + implementation plan for OpenStudent's first-launch onboarding. The flow follows a
story arc — problem recognition → personal question → reflection → setup as the value
moment → personalized summary — not a feature tour. By the end of it the user's **current
semester** (courses, tasks, exams) is fully set up and the dashboard shows *their* data,
not mock data. Everything else (past courses, grades, materials, recordings) is filled
afterwards inside the app.

> Before writing any code, read the exact versioned Expo docs at
> https://docs.expo.dev/versions/v57.0.0/ (per AGENTS.md), especially `expo-sqlite`
> (kv-store) and `expo-router` (protected routes).

---

## 1. Goals

| Goal | Definition of done |
|---|---|
| Remove mock data | App starts with empty collections; no Notion seed rows anywhere in the running app |
| Onboard the current semester | User leaves onboarding with their real courses + tasks + exams for the detected semester |
| Defer the rest | Past courses/grades, materials, recordings are added later via existing screens; empty states nudge toward this |
| Persist | Onboarding runs once; data survives app restart |
| Look good, stay light | One emoji per headline, accent-color highlights, progress dots — no confetti, no illustration packs |

**Conversion job (per the onboarding skill):** there is no signup/paywall. The "ask" is the
setup effort itself — entering courses, tasks and exam dates. The proof the user needs
before investing that effort is: *"this app understands how my semester at the Open
University actually works (ממ״נים, ממ״חים, מועדי בחינות)"*. The transformation:
*"I have one clear picture of my semester."*

---

## 2. Current state (what has to change)

1. **`src/data/seed.ts`** — 25 courses, 14 assignments, 15 exams, 4 recordings, 10
   materials ported from a Notion export. This is the mock data to clear.
2. **`src/data/catalog.ts`** — `COURSE_CATALOG` is *derived from* `seedCourses`. If the
   seed is emptied, the course picker dies. The catalog must become standalone static data.
3. **`src/data/store.ts`** — in-memory `createCollection` seeded from `seed.ts`;
   `reset()` restores the seed. Its doc comment already promises call sites won't change
   when swapping in a persisted backend — we cash that in now.
4. **No persistence at all** — no AsyncStorage / SQLite / SecureStore in the project.
   Without it, "onboarded" can't be remembered and user data evaporates on restart.
5. **`src/app/_layout.tsx`** — plain Stack with `(tabs)` + `capture`; no gating.
6. **Settings debug menu** (`settings.tsx`) — "איפוס נתוני דמו" calls `resetAllData()`
   which restores the *seed*. Must become "clear everything + rerun onboarding".
7. **Reusable building blocks already exist** — `CourseCatalogPicker` (multi-select from
   catalog, semester/year chips), `QuickTasksModal` (ממ״נ/ממ״ח counts → due-date review),
   `ExamFormModal` / `DateField`, `getCurrentSemester()` in `semester.ts`, `ChipField`,
   `FormSheet`/`SheetButton`, `ProgressBar`. Onboarding steps are mostly re-compositions
   of these, not new UI systems.

---

## 3. Data-layer changes (prerequisite work)

### 3.1 Make the catalog standalone
- Move the 25 course identity rows (number, name, faculty, credits, type, level) into
  `catalog.ts` as a literal `COURSE_CATALOG` array. Delete the derivation from
  `seedCourses`. This is the permanent "what courses exist at the Open University" list;
  it is *not* mock data.

### 3.2 Clear the mock data
- Delete `src/data/seed.ts`.
- `store.ts`: collections start from `[]` (e.g. `createCollection<Course>([])`).
- Update `constants.ts` / `stats.ts` / anything importing from `seed.ts`
  (`grep -r "from './seed'\|@/data/seed" src`).
- `reset()` / `resetAllData()` now mean "empty everything".

### 3.3 Add minimal persistence
- Install `npx expo install expo-sqlite` and use **`expo-sqlite/kv-store`**
  (AsyncStorage-compatible, sync API available, no config plugin needed).
- Persist two things:
  1. **`onboarding.completed`** — `'true' | null`, read synchronously at startup
     (`Storage.getItemSync`).
  2. **Collection snapshots** — inside `createCollection`, hydrate `items` from
     `Storage.getItemSync(key)` JSON on creation, and write-through
     (`Storage.setItem(key, JSON.stringify(items))`) in `notify()`. One key per
     collection: `data.courses`, `data.assignments`, `data.exams`, `data.recordings`,
     `data.materials`.
- No call-site changes anywhere — exactly the swap `store.ts` was designed for.
- Web fallback: `expo-sqlite/kv-store` works on web in SDK 57 via wa-sqlite; verify in
  the v57 docs, otherwise guard with `Platform.OS === 'web'` → localStorage.

### 3.4 Onboarding state module
- New `src/data/onboarding.ts`:
  ```ts
  export function hasCompletedOnboarding(): boolean
  export function markOnboardingComplete(): void
  export function resetOnboarding(): void   // for the debug menu
  ```

---

## 4. The flow — screen by screen

Six steps, one question, one reflection, setup as the climax. Every screen: RTL Hebrew,
progress dots at the top, primary button pinned at the bottom, secondary "דלג" as a ghost
button only where skipping is legitimate. Copy below is the actual proposed copy.

### Screen 1 — Problem recognition
- **Goal:** "this app gets my exact problem" in one glance.
- **Headline:** `כל התואר שלך. מקום אחד. 🎓`
- **Body:** `ממ״נים, ממ״חים, מועדי בחינות והקלטות — מפוזרים בין מיילים, אקסלים והזיכרון. OpenStudent מסדר את הסמסטר בשבילך.`
- **Primary:** `בואו נתחיל`
- **Why here:** opens with the scattered-semester pain, not a feature list. The three
  Open-University-specific terms are the credibility signal.

### Screen 2 — Personal question (commitment)
- **Goal:** the user states their own motivation; answer personalizes screens 3 and 6.
- **Headline:** `מה הכי מציק לך בלימודים?`
- **Options (single select, `ChipField`-style large rows):**
  - 📅 `לא לפספס תאריכי הגשה`
  - 🧭 `לדעת איפה אני עומד בתואר`
  - 🎧 `לעקוב אחרי הרצאות והקלטות`
  - 📚 `לארגן את כל החומרים`
- **Primary:** `המשך` (enabled after selection). No skip — one question is the minimum
  commitment device, and it's cheap.
- **Why here:** per the skill, questions about *struggle* beat preference questions; the
  answer is mirrored back immediately and again at the finish.

### Screen 3 — Reflection
- **Goal:** the user feels heard before being asked to do work.
- **Copy branches on the answer:**
  - 📅 → `קיבלנו. אף תאריך הגשה לא יתפספס יותר — כל מטלה עם דדליין במקום אחד.`
  - 🧭 → `קיבלנו. תמיד תדעו בדיוק כמה נק״ז נשארו ומה הממוצע — בלי אקסל.`
  - 🎧 → `קיבלנו. נסמן בדיוק באיזו הקלטה עצרת, בכל קורס.`
  - 📚 → `קיבלנו. כל חומר שתתפסו נכנס לקורס הנכון, אוטומטית.`
- **Sub-line (all branches):** `נתחיל מהסמסטר הנוכחי — זה לוקח דקה.`
- **Primary:** `יאללה`
- **Why here:** reflection converts a generic wizard into a conversation, and the sub-line
  sets the expectation that the next part is short.

### Screen 4 — Current semester courses (setup begins)
- **Goal:** pick the current semester's courses from the catalog.
- **Headline:** `אילו קורסים לומדים הסמסטר? 📖`
- **Semester chip (auto-detected, tappable to change):** e.g. `סמסטר ג׳ · 2026` from
  `getCurrentSemester()` — small accent-colored pill above the list.
- **Body:** search field + catalog multi-select — the exact UI of
  `CourseCatalogPicker`, extracted into a shared inner component
  (`CourseCatalogList`) used by both the modal and this screen.
- **Primary:** `המשך עם N קורסים` (disabled at 0).
- **No skip** — an empty semester makes every following screen and the dashboard
  pointless. If the user truly has no courses, they can back out via a small
  `אין לי קורסים כרגע` text link → jumps to Screen 6 with an empty-state variant.
- **Why here:** the reflection just promised value "in a minute"; this is the first and
  biggest step of the ask, placed after commitment, exactly per the skill's timing.

### Screen 5 — Tasks & exam per course (loop)
- **Goal:** for each selected course, capture ממ״נ/ממ״ח counts + due dates and an exam
  date, with graceful skipping.
- **One sub-screen per course**, header: `קורס 2/3 · לוגיקה למדעי המחשב`
- **Section א — מטלות ✍️:** reuse the `QuickTasksModal` two-phase flow inline
  (extract its body into `QuickTasksForm`): count chips for ממ״נ and ממ״ח, then a
  due-date row per task (empty → 30 days out, as today).
- **Section ב — מבחן 🗓️:** single optional `DateField`: `מתי המבחן? (אפשר לדלג)`.
  If set → create an `Exam` titled with the course name, no grade.
- **Primary:** `שמור והמשך` · **Secondary (ghost):** `דלג על הקורס הזה`
- **Why here:** this is the heavy lift, so it's chunked per course with visible progress
  (`2/3`), each chunk skippable — effort feels bounded.

### Screen 6 — Summary (climax + conclusion)
- **Goal:** show the concrete result of their answers — the value preview before landing.
- **Headline:** `הסמסטר שלך מוכן ✨`
- **Body:** a real (not illustrative) summary card, styled like a `DashboardCard`:
  - `📖 3 קורסים · ✍️ 8 מטלות · 🗓️ 2 מבחנים`
  - The nearest deadline called out: `הדדליין הקרוב: ממ״נ 11 · 2026-07-14`
- **Mirror the Screen-2 answer:** e.g. for 📅 — `מעכשיו כל תאריך הגשה נמצא בדשבורד — בלי הפתעות.`
- **Deferral line (the "rest afterwards" contract):** `קורסים שכבר עברת, ציונים וחומרים? מוסיפים בקלות אחר־כך מהמסך "תוכנית".`
- **Primary:** `לדשבורד →` — calls `markOnboardingComplete()` and routes to `(tabs)`.
- **Why here:** the skill requires a concrete value preview built from the user's own
  input before finishing; the deferral line prevents "wait, where are my old grades?"
  confusion on the dashboard.

**Empty-state variant** (came via "אין לי קורסים כרגע"): headline `מתחילים נקי 🌱`, body
explains courses can be added any time from "תוכנית", same primary button.

### Flow diagram

```txt
1 בעיה  →  2 שאלה  →  3 שיקוף  →  4 קורסים  →  5 מטלות+מבחן ×N  →  6 סיכום  →  (tabs)
                                      ↘ "אין לי קורסים" ────────────────↗ (variant)
```

---

## 5. Visual design — simple and light

- **Emoji budget:** exactly one in each headline, plus the four option emojis on Screen 2
  and the three stat emojis on Screen 6. Never in body copy, never in buttons.
- **Color:** stick to the existing theme tokens. White/near-black background
  (`background`), one accent usage per screen — the primary button (`accent`) and the
  semester pill / selected chips (`accentSoft`). No gradients, no new palette.
- **Progress:** 6 small dots top-center (active = accent, rest = `border`); inside
  Screen 5, textual `קורס 2/3` — don't double up indicators.
- **Layout:** same rhythm as the rest of the app — `Spacing.three` padding,
  `Radius.lg` cards, `ThemedText type="title"` headlines, generous whitespace. Screens
  should feel like the app, so landing on the dashboard isn't a style jump.
- **Motion:** a single subtle fade/slide between steps (reuse the reanimated setup);
  nothing springy.
- **RTL:** all new screens use `rtlTextAlign` / `rtlFlexDirection` like existing code.

---

## 6. Routing & gating

- New route group: `src/app/onboarding/` (or a single `onboarding.tsx` with internal
  step state — **recommended**: single route + internal `step` state, since steps share
  the selected-courses working state and there's no need for per-step deep links).
- `src/app/_layout.tsx`: gate with expo-router protected routes:
  ```tsx
  const onboarded = hasCompletedOnboarding(); // sync read, no flash
  <Stack>
    <Stack.Protected guard={onboarded}>
      <Stack.Screen name="(tabs)" ... />
      <Stack.Screen name="capture" ... />
    </Stack.Protected>
    <Stack.Protected guard={!onboarded}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack.Protected>
  </Stack>
  ```
  (Verify `Stack.Protected` in the v57 expo-router docs; fallback is a `<Redirect>` from
  a root `index`.)
- Onboarding writes data **only on Screen 5's "שמור והמשך"** (per course, via
  `coursesCollection.add` on Screen 4's continue + `assignmentsCollection.addMany` /
  `examsCollection.add` per course). Backing out mid-flow leaves whatever was already
  saved — acceptable, since re-entering shows enrolled courses as checked/disabled.

---

## 7. Post-onboarding: "the rest afterwards"

- **Plan screen (`plan.tsx`)** is the home for backfilling the degree: add past
  courses (with grades) via the same catalog picker with an earlier year/semester.
  Add an empty-state card when only current-semester courses exist:
  `רוצה לראות התקדמות בתואר? הוסיפו קורסים שכבר עברת 🧭` → opens `CourseCatalogPicker`.
- **Dashboard empty adjustments:** with no past grades, hide/soften "מגמת ציונים"
  (already conditional) and make the degree-progress card show a gentle
  `הוסיפו קורסים שעברת כדי לראות התקדמות` caption instead of `0%` shame.
- **Materials/recordings:** untouched — their existing empty states + `CaptureFab`
  already cover "fill later".
- **Settings debug menu:** replace `איפוס נתוני דמו` with
  `איפוס נתונים ואונבורדינג` → `resetAllData()` + `resetOnboarding()` + route to
  `/onboarding`.

---

## 8. Implementation checklist (ordered)

1. [ ] Read Expo v57 docs: `expo-sqlite` kv-store, `expo-router` protected routes.
2. [ ] `catalog.ts`: inline the static 25-course catalog; drop the `seed.ts` import.
3. [ ] Add `expo-sqlite`; persistence wrapper in `store.ts` (hydrate + write-through).
4. [ ] `src/data/onboarding.ts` (completed flag over kv-store).
5. [ ] Delete `seed.ts`; empty collections; fix all imports; `resetAllData` semantics.
6. [ ] Extract `CourseCatalogList` from `CourseCatalogPicker`; extract `QuickTasksForm`
       from `QuickTasksModal` (both keep their modal wrappers working).
7. [ ] Build `src/app/onboarding.tsx`: step state machine, progress dots, screens 1–6
       with copy above.
8. [ ] Gate routes in `_layout.tsx`.
9. [ ] Plan-screen empty-state nudge + dashboard empty softening.
10. [ ] Settings: reset → clear + rerun onboarding.
11. [ ] QA: fresh install → full flow; skip paths; "אין לי קורסים"; restart persistence;
        reset from settings; RTL on device; web.

---

## 9. Review checklist (from the onboarding skill)

- [x] Starts from the user's problem (scattered semester), not the feature list.
- [x] The single question increases both personalization (screens 3, 6) and commitment.
- [x] Important answers are reflected back (Screen 3, mirrored again in Screen 6).
- [x] Concrete value preview before finishing (Screen 6 real-data summary).
- [x] Social proof — intentionally omitted: no signup/paywall ask, and the app is
      personal/local; a fake "1,000 students" line would cost trust.
- [x] The big ask (setup effort) comes after problem + commitment + reflection.
- [x] Clear intro (1–3), climax (4–5 → 6 reveal), conclusion (6 deferral + handoff).
- [x] Targets activation: the success metric is a dashboard with ≥1 course, ≥1 task
      after first launch.
