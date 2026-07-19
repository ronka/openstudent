# Home-Screen Widgets — Technical Plan

Add three iOS home-screen widgets using the new `expo-widgets` module (SDK 57):

1. **Upcoming deadlines** — next open assignments and days remaining (systemSmall + systemMedium)
2. **Next exam countdown** — nearest ungraded exam with course name and days left (systemSmall)
3. **Degree progress** — degree completion % and GPA (systemSmall)

**Docs:** https://docs.expo.dev/versions/v57.0.0/sdk/widgets/

## Scope decisions (agreed)

- **iOS only.** `expo-widgets` has no Android support. Android is out of scope; revisit if Expo adds it.
- **Home-screen families only** (`systemSmall`, `systemMedium`). No Lock Screen accessory families.
- No Live Activities in this phase (Pomodoro Live Activity deferred).

## How expo-widgets works (relevant facts)

- Widgets are written in TypeScript as **`@expo/ui/swift-ui` components** marked with the `'widget'` directive, registered with `createWidget(name, component)`. They compile to a native WidgetKit extension — they do **not** run React or arbitrary JS at render time.
- Data flows **from the app's JS process to the widget** via `Widget.updateSnapshot(props)` (immediate) and `Widget.updateTimeline(entries)` (pre-scheduled future entries). The widget cannot fetch or compute data on its own.
- A config plugin generates the native widget extension target during prebuild — fits our CNG setup (no `ios/` dir committed).
- Requires a **development build**; widgets do not work in Expo Go.
- The widget component receives `(props, environment)` where `environment` includes `widgetFamily` and `colorScheme` for responsive/dark-mode layouts.

## Architecture

### Data flow

All widget data is personal, on-device data (`expo-sqlite/kv-store` behind `src/data/store.ts`). No server involvement.

```
store.ts collections ──change──▶ widget updater ──updateTimeline──▶ WidgetKit
        (courses / assignments / exams)      (pure props builders)
```

- **Props builders** (pure functions): reuse the existing derivations in `src/data/stats.ts` — `upcomingAssignmentsSorted`, `upcomingExamsSorted`, `degreeStats`, `gpaStats` — to build small serializable props objects per widget.
- **Updater trigger points:**
  1. Every store mutation — hook into `createCollection`'s `notify()` in `src/data/store.ts:33` (or subscribe to the three collections from one updater module, which avoids touching the store internals).
  2. App foreground (`AppState` listener) — refreshes "days left" after the app was backgrounded across midnight.
- **Staleness handling:** widgets only update when the app runs, so "days left" would go stale overnight. Fix with **timelines**: on every update, emit one timeline entry per upcoming midnight for the next ~14 days, each with recomputed `daysLeft` values. WidgetKit then flips the numbers at midnight without the app running.

### New files

```
src/widgets/
  deadlines-widget.tsx      # createWidget('DeadlinesWidget', ...)
  exam-widget.tsx           # createWidget('ExamWidget', ...)
  progress-widget.tsx       # createWidget('ProgressWidget', ...)
  props.ts                  # pure builders: (courses, assignments, exams, date) -> widget props
  updater.ts                # subscribes to collections + AppState; calls updateTimeline on each widget
```

`updater.ts` is imported once from `src/app/_layout.tsx` (side-effect init, same place the store/RTL init happens).

### Widget props (serializable, computed in `props.ts`)

- **DeadlinesWidget:** `{ items: { name, courseName, daysLeft, dueDate }[] }` — top 1 (small) / 3 (medium) from `upcomingAssignmentsSorted`; empty state "אין מטלות פתוחות".
- **ExamWidget:** `{ title, courseName, date, daysLeft } | { empty: true }` — first of `upcomingExamsSorted`.
- **ProgressWidget:** `{ degreePct, passedCredits, totalCredits, gpa }` from `degreeStats` + `gpaStats`.

Course names resolve via `courseId` lookup against the courses collection at build time (widgets can't join data themselves).

## Configuration changes

### app.json

```json
[
  "expo-widgets",
  {
    "bundleIdentifier": "com.ronkaa.openstudent.widgets",
    "groupIdentifier": "group.com.ronkaa.openstudent",
    "widgets": [
      { "name": "DeadlinesWidget", "displayName": "מטלות קרובות", "description": "המטלות הפתוחות הקרובות ביותר", "supportedFamilies": ["systemSmall", "systemMedium"] },
      { "name": "ExamWidget", "displayName": "המבחן הבא", "description": "ספירה לאחור למבחן הקרוב", "supportedFamilies": ["systemSmall"] },
      { "name": "ProgressWidget", "displayName": "התקדמות בתואר", "description": "אחוז השלמת התואר והממוצע", "supportedFamilies": ["systemSmall"] }
    ]
  }
]
```

(`enablePushNotifications` omitted — only needed for Live Activities.)

### Dependencies

- `npx expo install expo-widgets` (`@expo/ui` is already installed at `~57.0.3`).

### Build/credential implications

- New native target ⇒ **cannot ship via OTA update**. Requires new binaries: bump app version (`runtimeVersion.policy: appVersion` means a new runtime), rebuild dev client and production builds.
- EAS-managed credentials must provision the **widget extension bundle ID + App Group capability**; EAS handles this automatically on the next `eas build`, but first build will mint new provisioning profiles.

## Implementation steps

1. **Install + configure** — add `expo-widgets`, add the config plugin block to `app.json`.
   Status: done — `expo-widgets@~57.0.6` added to `package.json`; `expo-widgets` plugin block added to `app.json` (bundle/group IDs + three widgets). (`npx expo install` not run in this no-build pass; `babel-preset-expo` auto-enables the `'widget'` transform once the dep is installed — no babel config change needed.)
2. **Props builders** (`src/widgets/props.ts`) — pure functions over the collections + a `now` date; includes the midnight-timeline entry generator. Unit-testable in isolation.
   Status: done — `buildDeadlinesTimeline` / `buildExamTimeline` / `buildProgressTimeline`, plus `upcomingMidnights` (14-day generator) and pre-computed Hebrew `daysLabel`s. Pure over `(collections, now)`.
3. **Widget components** — build the three `'widget'` components with `@expo/ui/swift-ui` (`VStack`/`HStack`/`Text`, `Gauge` or a bar for progress). Handle `systemSmall` vs `systemMedium` via `environment.widgetFamily`, dark mode via `environment.colorScheme`, and empty states (new user with no data).
   Status: done — `deadlines-widget.tsx` (small/medium), `exam-widget.tsx`, `progress-widget.tsx`. Family + `colorScheme` branching and empty states handled. Progress shown as a formatted % + credits + GPA (text, not `Gauge`, to avoid relying on an unstyleable gauge in `systemSmall`).
4. **Updater** (`src/widgets/updater.ts`) — subscribe to `coursesCollection`/`assignmentsCollection`/`examsCollection` + `AppState` foreground; debounce (mutations come in bursts, e.g. `addMany`); call `updateTimeline` per widget. Import from `_layout.tsx`, guarded to iOS native only (no-op on web/Android).
   Status: done — `initWidgets()` (iOS-guarded, lazy-`require`s the native widget modules), 500ms debounce, subscribes to the three collections + `AppState`. Called from `_layout.tsx` next to `initializeRTL()`.
5. **Dev build + manual verification** — `npm run build:simulator:ios` (or `expo run:ios`), add each widget from the gallery, verify: data renders, RTL/Hebrew layout, dark mode, empty states, midnight rollover (simulate by advancing entries), tap opens the app.
   Status: blocked
   Blocker: requires a native dev build — out of scope for this pass (user asked to skip the build and just open a PR). Run before merging.
6. **Ship** — `node scripts/bump-app-version.js` path via `npm run build:production:ios`, submit with `npm run submit:production:ios`.
   Status: blocked
   Blocker: requires production build + store submit — out of scope for this pass. New native target means no OTA; ship via new binaries after step 5.

## Risks / open items

- **`expo-widgets` is brand-new in SDK 57** — expect alpha-quality edges; pin the installed version and verify against the exact v57 docs before coding (per AGENTS.md).
- **RTL rendering inside the widget extension**: the app forces RTL via `expo-localization`, but the widget extension follows device locale. Must verify Hebrew text and HStack ordering render correctly on an English-locale device; may need explicit trailing alignment / reversed stacks.
- **Timeline entry limits**: WidgetKit caps timeline sizes; ~14 midnight entries per widget is safely within limits.
- **Deep linking from widgets** into specific tabs (e.g. tapping the exam widget → exams tab) — verify what `expo-widgets` supports (widget-level URL vs. `addUserInteractionListener`); default behavior (tap opens app) is acceptable for v1.
- **Simulator support**: widgets work on the iOS simulator, but midnight/timeline behavior is best verified on a device.
