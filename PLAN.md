# OpenStudent — App Plan

A React Native / Expo port of my Notion study-management template
**"תואר במדעי המחשב 2023"** (CS Degree 2023, by Ron Kantor / ronka.dev).

The app is a **Hebrew, right-to-left (RTL)** study organizer for an Open University
degree: track courses, assignments (ממן/ממח), exams, lecture recordings, and study
materials — all linked to a central Courses database, with a dashboard of "what's
happening now" and a quick-capture inbox for use on the phone.

> Status: **planning only — nothing implemented yet.** This document describes the
> intended structure and ships a mock/seed database taken from the Notion export so
> we can build UI against realistic data.

---

## 1. Core concept

Everything revolves around a **Course**. Each course has:

- **Assignments** (מטלות) — the ממן/ממח homework you submit, with due dates & status
- **Exams** (מבחנים) — exam dates and grades
- **Recordings** (הקלטות) — which lecture recordings you've watched
- **Materials** (חומרים) — articles, videos, notes, links

A separate **Study Plan** (תוכנית לימודים) holds the full multi-year degree roadmap
(all courses across all years/semesters, not just active ones).

A **Dashboard** (the home page) surfaces filtered live views: courses in progress,
open TODOs, upcoming exams, recording tracker, assignments journal.

A **Quick-capture inbox** ([טלפון] איסוף) lets you dump a task or material fast from
the phone, to be filed to a course later.

---

## 2. Data model

Six databases. Hebrew field names from the export are kept as the source of truth;
English identifiers in `code` are the proposed TS field names.

### 2.1 Courses — `courses` (רשימת קורסים) — central entity

**Decision:** this is the single unified course catalog. The old separate *Study Plan*
(§2.6) is not its own database — it's a **grouped view** over `courses` (by year →
semester). So this table absorbs the plan's `year` / `semester` / `grade` fields.

| Notion field | code | Type | Notes |
|---|---|---|---|
| שם הקורס | `name` | title | e.g. "אלגברה לינארית 1" |
| מספר קורס | `courseNumber` | text | OU course code, e.g. "20109" |
| פקולטה | `faculty` | select | `מתמטיקה` \| `מדעי המחשב` |
| נקודות זכות | `credits` | number | credit points |
| סוג | `type` | select | `חובה` (required) \| `בחירה` (elective) \| `סמינר` (seminar) |
| רמה | `level` | select | `ר` (intro) \| `מ` (advanced) — OU course level |
| סטאטוס | `status` | select | `planned` (מתוכנן) \| `studying` (בלימוד) \| `passed` (עובר) |
| שנה | `year` | number | for plan grouping, e.g. 2022 |
| סמסטר | `semester` | select | `א` \| `ב` \| `ג` |
| ציון | `grade` | number | final course grade, once passed |
| הערות | `notes` | text | free notes |

Relations (back-links from the databases below): `assignments[]`, `exams[]`,
`recordings[]`, `materials[]`.

### 2.2 Assignments — `assignments` (מטלות / רשימת מטלות)

| Notion field | code | Type | Notes |
|---|---|---|---|
| שם | `name` | title | e.g. "ממן 11", "ממח 21" |
| קורס | `courseId` | relation → courses | |
| סטאטוס | `status` | select | `לעשות` (todo) \| `בתהליך` (in progress) \| `נגמר` (done) |
| תאריך הגשה | `dueDate` | date | |
| חומרים | `materialIds` | relation → materials | linked study materials |

### 2.3 Exams — `exams` (רשימת מבחנים)

| Notion field | code | Type | Notes |
|---|---|---|---|
| חומרים | `title` | title | exam name (usually the course) |
| קורס | `courseId` | relation → courses | |
| תאריך | `date` | date | |
| ציון | `grade` | number | empty until graded |

### 2.4 Recordings — `recordings` (מעקב הקלטות)

| Notion field | code | Type | Notes |
|---|---|---|---|
| שם | `name` | title | e.g. "הקלטה" |
| מספר הקלטה | `recordingNumber` | number | last watched lecture # |
| קורס | `courseId` | relation → courses | |

### 2.5 Materials — `materials` (חומרים / רשימת חומרים)

| Notion field | code | Type | Notes |
|---|---|---|---|
| Name | `name` | title | e.g. "מאמר מעניין" |
| קורס | `courseId` | relation → courses | optional |
| מטלות | `assignmentIds` | relation → assignments | optional |
| תגיות | `tags` | multi-select | |
| תאריך יצירה | `createdAt` | created time | |

### 2.6 Study Plan (תוכנית לימודים) — *a view, not a database*

**Decision:** merged into `courses` (§2.1). The Study Plan screen is a grouped/sorted
**view** of the same course records — grouped by `year`, then `semester`, showing every
course regardless of `status`. The Dashboard/Courses screens view the same data filtered
to `status = studying`. No separate table, no duplicated rows.

### Relationships

```
                 ┌──────────────┐
                 │   Courses    │  ← single catalog (status: planned|studying|passed)
                 └──────┬───────┘
        ┌───────────┬───┴────┬───────────┐
        ▼           ▼        ▼           ▼
  Assignments    Exams   Recordings   Materials
        │                               ▲
        └──────────── links ────────────┘
   (an assignment can reference materials, and vice-versa)

  Study Plan = grouped VIEW of Courses (by year → semester), not a table
  Inbox (Quick-capture) ──(files into)──► Assignments / Materials
```

---

## 3. Screens & navigation (expo-router, `src/app/`)

Bottom tabs (RTL-aware), mirroring the Notion dashboard + quick-access:

- **בית / Dashboard** (`index`) — live sections:
  - קורסים בלימוד — active courses (`status = בלימוד`)
  - משימות TODO — open assignments
  - מבחנים קרבים — upcoming exams (date-sorted)
  - מעקב הקלטות — recordings tracker
  - יומן מטלות — recent assignments
- **קורסים / Courses** (`courses/index`, `courses/[id]`) — list → course detail with
  tabs for that course's assignments / exams / recordings / materials
- **מטלות / Assignments** (`assignments`) — all assignments, filter by status/course
- **מבחנים / Exams** (`exams`) — calendar/list of exam dates + grades
- **חומרים / Materials** (`materials`) — resource library, filter by tag/course
- **תוכנית / Study Plan** (`plan`) — degree roadmap grouped by year → semester
- **➕ Quick capture** — modal to add a task or material to the inbox
- **פומודורו / Pomodoro** — static how-to page + optional built-in 25-min timer
- **הגדרות / Settings** (`settings`) — app version display + hidden debug menu
  (triple-tap to reveal). Built with the **`/app-version-debug`** skill — see §5.

---

## 4. Mock / seed database

A plain-TS in-memory store (proposed `src/data/seed.ts`) so we can build UI before
wiring persistence. Data below is lifted from the Notion export.

### Courses (sample)

| name | courseNumber | faculty | credits | type | level | status |
|---|---|---|---|---|---|---|
| מתמטיקה בדידה | 20476 | מתמטיקה | 4 | חובה | ר | עובר |
| אלגברה לינארית 1 | 20109 | מתמטיקה | 6 | חובה | ר | עובר |
| מבוא למדעי המחשב ושפת Java | 20441 | מדעי המחשב | 6 | חובה | ר | עובר |
| אלגברה לינארית 2 | 20229 | מתמטיקה | 4 | חובה | ר | עובר |
| אוטומטים ושפות פורמליות | — | מדעי המחשב | — | חובה | — | בלימוד |
| לוגיקה למדעי המחשב | — | מדעי המחשב | — | חובה | — | בלימוד |

### Assignments (sample)

| name | course | status | dueDate |
|---|---|---|---|
| ממן 14 | אוטומטים ושפות פורמליות | בתהליך | 2023-07-22 |
| ממח 21 | אוטומטים ושפות פורמליות | בתהליך | 2023-07-27 |
| ממח 22 | אוטומטים ושפות פורמליות | לעשות | 2023-07-07 |
| ממן 11 | לוגיקה למדעי המחשב | בתהליך | 2023-07-05 |
| ממן 12 | לוגיקה למדעי המחשב | בתהליך | 2023-07-07 |
| ממן 11 | אוטומטים ושפות פורמליות | נגמר | 2023-07-06 |
| ממן 12 | מתמטיקה בדידה | נגמר | 2023-07-06 |

### Exams (sample)

| title | course | date | grade |
|---|---|---|---|
| אוטומטים ושפות פורמליות | אוטומטים ושפות פורמליות | 2023-12-01 | — |
| לוגיקה למדעי המחשב | לוגיקה למדעי המחשב | 2023-10-01 | — |
| מערכות בסיסי-נתונים | מערכות בסיסי-נתונים | 2023-06-16 | 90 |
| הסתברות לתלמידי מדעי המחשב | הסתברות לתלמידי מדעי המחשב | 2023-06-15 | 87 |

### Recordings (sample)

| name | recordingNumber | course |
|---|---|---|
| הקלטה | 3 | אוטומטים ושפות פורמליות |
| הקלטה | 12 | מתמטיקה בדידה |
| הקלטה | 4 | לוגיקה למדעי המחשב |
| הקלטה | 7 | אלגברה לינארית 1 |

### Materials (sample)

| name | course | assignment | createdAt |
|---|---|---|---|
| מאמר מעניין | לוגיקה למדעי המחשב | ממן 12 | 2023-07-20 |
| איך כותבים שפה פורמלית | אוטומטים ושפות פורמליות | ממן 14 | 2023-07-20 |
| שפה רגולרית | אוטומטים ושפות פורמליות | ממח 21 | 2023-07-20 |
| סירטונים על משוואות לינאריות | אלגברה לינארית 1 | — | 2023-07-20 |
| עוד מאמר | — | — | 2023-07-20 |

### Study Plan rows (these are just more `courses`, with `status = planned`)

Same `courses` table — shown here with the plan fields populated. The Study Plan screen
groups all course rows by year → semester.

| year | semester | name | courseNumber | faculty | credits | type | level | status |
|---|---|---|---|---|---|---|---|---|
| 2021 | ב | מערכות הפעלה | 20594 | מדעי המחשב | 4 | חובה | מ | planned |
| 2021 | ב | עקרונות פיתוח מערכות מידע | 20436 | מדעי המחשב | 4 | בחירה | ר | planned |
| 2022 | ב | תכנות מתקדם בשפת Java | 20554 | מדעי המחשב | 4 | בחירה | מ | planned |
| 2022 | ג | סמינר בהנדסת תוכנה | 20368 | מדעי המחשב | 3 | סמינר | — | planned |

---

## 5. Cross-cutting concerns

- **RTL / Hebrew — `/rtl-layout` skill:** all UI is Hebrew-first, RTL. Use the
  **`/rtl-layout`** skill whenever building or editing any layout/UI component. It
  provides an RTL utility module and directional-style guidelines (flexDirection,
  textAlign, margins/borders, alignment) so every screen mirrors consistently. This
  applies to *every* screen in §3 — treat it as the default for all component work.
- **Version & debug menu — `/app-version-debug` skill:** the **Settings** screen (§3)
  is built with the **`/app-version-debug`** skill. It adds:
  - a two-part version display — semver from `app.json` + an OTA `UPDATE_VERSION` counter
  - a hidden debug menu revealed by triple-tapping the version label
  - version-bump scripts already vendored in `scripts/` (`bump-app-version.js`,
    `increment-update-version.js`) plus the matching `package.json` build/update scripts
- **Persistence:** start with the in-memory seed; later back it with SQLite / AsyncStorage.
  (The Notion source is relational, so the local store should keep the same shape.)
- **Enums as constants:** statuses, types, levels, semesters are fixed vocabularies —
  centralize them so filters and badges stay consistent.
- **Pomodoro:** the Notion page is just instructions + a link to pomofocus.io. We could
  ship a real in-app timer instead.

### Skills used by this project

| Skill | Where it applies |
|---|---|
| `/rtl-layout` | Every UI/layout component — RTL directional styles |
| `/app-version-debug` | Settings screen: version display, hidden debug menu, EAS version-bump scripts |

---

## 6. Decisions & open questions

### Decided

- ✅ **Scope of v1** — ship **all six areas**: Dashboard, Courses, Assignments, Exams,
  Materials, Study Plan (+ Recordings surfaced within courses/dashboard).
- ✅ **Study Plan vs Courses** — **one unified `courses` table** with
  `status: planned | studying | passed`. Study Plan is a grouped *view*, not a table.
- ✅ **Persistence** — **in-memory seed only** for v1 (`src/data/seed.ts`). Edits reset on
  reload; keep the store shaped so SQLite can slot in later without model changes.

### Still open

3. **Language** — Hebrew-only, or build i18n in from day one? *(leaning Hebrew-only, RTL.)*
5. **Pomodoro** — real built-in timer, or just an info screen + external link like Notion?
6. **Quick-capture inbox** — keep it as a separate "unfiled" bucket, or drop it and add
   directly to courses (the inbox exists mostly for Notion's mobile limitations)?
