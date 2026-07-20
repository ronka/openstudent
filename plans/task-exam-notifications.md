# Task & Exam Reminder Notifications

Local scheduled notifications for assignments (ממ״נים/ממ״חים) and exams: **two reminders
per item — a week before and a day before** the due date, both at **09:00 local time**.
Reminders follow the data automatically: changing a due date reschedules, deleting or
completing an item cancels. New users are asked to enable notifications in a new
onboarding step; existing users get a one-time prompt plus a permanent settings toggle.

Everything is on-device (`expo-notifications` scheduled local notifications). No push
server, no tokens, no backend changes.

> Before writing any code, read the exact versioned Expo docs at
> https://docs.expo.dev/versions/v57.0.0/ (per AGENTS.md), especially `expo-notifications`
> (scheduling, permissions, Android channels, config plugin) and re-check the iOS
> 64-pending-notifications limit.

---

## 1. Decisions (agreed with the user)

| Question | Decision |
|---|---|
| Fire time | 09:00 local time, both reminders |
| Item due < 7 days away | Skip reminders whose time already passed — never fire "catch-up" notifications |
| Existing (already-onboarded) users | One-time in-app prompt + permanent toggle in settings |
| Task marked done | Cancel its pending reminders; re-schedule if toggled back to todo |

Additional rules that follow from the data model:

- `Assignment.dueDate` is **optional** → task without a date gets no reminders.
- `Exam.date` is required → every future-dated exam gets reminders.
- An exam whose date passed, or that has a grade, needs nothing special — its trigger
  times are in the past, so the skip-past rule already covers it.
- Notifications are scheduled only when *enabled* = user opted in **and** OS permission
  is granted. Turning the toggle off cancels everything; turning it back on re-schedules
  everything.

## 2. Current state (verified in code)

- **No notification code exists.** `expo-notifications` is not in `package.json`; no
  plugin in `app.json`; no `Notifications.*` calls anywhere in `src/`.
- **Data**: `src/data/types.ts` — `Assignment { id, name, courseId, status: 'todo'|'done', dueDate?: 'YYYY-MM-DD' }`,
  `Exam { id, title, courseId, date: 'YYYY-MM-DD', grade? }`. Course names come from
  `coursesCollection` via `courseId`.
- **Storage**: `src/data/store.ts` — custom `createCollection` (`useSyncExternalStore`)
  with mutators `add/addMany/update/remove/reset`, every mutator funnels through
  `notify()` (line 32) which persists and fires **subscribers**. Backed by
  `expo-sqlite/kv-store` via `src/data/kv-storage.ts` (sync get/set).
- **Write sites** (all funnel through the collections): `assignment-form-modal.tsx`
  (create/edit incl. dueDate), `exam-form-modal.tsx` (create/edit/delete), swipe-delete in
  `assignments/index.tsx:51` and `exams/index.tsx:135`, detail-screen delete in
  `assignments/[id].tsx:32`, status toggles in 4 places, and bulk `addMany` in onboarding.
- **Onboarding**: `src/app/onboarding.tsx`, single component, `TOTAL_STEPS = 7`, manual
  `setStep()` advancement; `completeOnboarding()` (line 119) flushes all data atomically
  and calls `markOnboardingComplete()`.
- **Per-concern persisted scalars** follow the `src/data/profile.ts` /
  `src/data/onboarding.ts` pattern (kv-store key + `useSyncExternalStore` hook). Reuse it.
- **Settings screen**: `src/app/(tabs)/settings.tsx` — version row + hidden triple-tap
  debug menu. No toggles yet.
- **UI**: Hebrew, RTL-forced, inline Hebrew string literals, `src/utils/rtl.ts` helpers,
  `rtl-layout` skill applies to any new UI. Date math uses `parseLocalDate` (local noon)
  in `src/utils/date.ts` — reminder triggers must use the same local-date parsing.

## 3. Architecture — reconcile, don't chase call sites

There are ~10 scattered write sites and `update()` takes partial patches, so hooking each
call site is fragile. Instead: **a single idempotent reconciler** that diffs *desired*
reminders (derived from current collections) against *actually scheduled* ones (a
persisted map), and runs on every data change.

```
collections (assignments, exams, courses)
        │ subscribe (store.ts already has subscribers)
        ▼
reconcileNotifications()          ← also runs on: app start, permission granted,
        │                            toggle on/off
        ├─ desired = for each todo assignment with future dueDate + each exam:
        │     [week-before@09:00, day-before@09:00], keep only future triggers
        ├─ scheduled = persisted map { entityId → [{ notifId, triggerISO, kind }] }
        ├─ cancel entries whose entity is gone / done / date changed / disabled
        └─ schedule missing entries, persist updated map
```

Why this wins:

- **Every path is covered for free** — form edits, swipe deletes, status toggles,
  onboarding `addMany`, debug-menu `reset`, and any future write site. Zero changes to
  existing components.
- **Idempotent + self-healing**: app start re-runs it, so a missed run (crash, OS purge
  of scheduled notifications, permission revoked-then-restored) converges to correct
  state. Never trust the map blindly — on app start, reconcile against
  `Notifications.getAllScheduledNotificationsAsync()` too.
- Date change detection is trivial: the persisted map stores each reminder's trigger
  time; if the recomputed trigger differs, cancel + reschedule.
- Scale is tiny (dozens of items → well under the iOS 64-pending limit; if the map ever
  exceeds ~60 desired entries, schedule the soonest 60 — note this in code).

Debounce the collection-subscriber trigger (~500ms) so a burst of writes (onboarding
flush) reconciles once.

## 4. Implementation tasks

### Task 1 — Install & configure `expo-notifications`
Status: done

- [x] `npx expo install expo-notifications` (added `~57.0.6`)
- [x] Add `expo-notifications` to `app.json` `plugins` (added with `color: "#ffffff"`;
      no custom `icon` since no dedicated 96×96 white notification asset exists — Android
      falls back to the app icon).
- [x] Note: config-plugin change means the next **native build** is required for
      Android notification icon/channel polish, but local notifications work in the
      existing dev client on iOS; verify behavior in the dev client first.
- [x] In app root (`src/app/_layout.tsx`): set `Notifications.setNotificationHandler`
      so notifications also show as banners while the app is foregrounded.

### Task 2 — Preference & prompt-tracking module (`src/data/notification-settings.ts`)

Status: done

Mirror `profile.ts` exactly (kv-store + `useSyncExternalStore`):

- [x] `settings.notificationsEnabled` — `'true' | 'false' | unset`. Unset = never asked.
- [x] `notifications.promptSeen` — `'true'` once the one-time prompt (or onboarding step)
      was shown, so existing users see the prompt exactly once. (`usePromptSeen()` +
      `markPromptSeen()`.)
- [x] Hooks: `useNotificationsEnabled()`, plus plain getters/setters for non-React code.
- [x] `enableNotifications()` helper: requests OS permission
      (`Notifications.requestPermissionsAsync()`), on grant sets flag `'true'` and
      triggers reconcile; on denial sets flag `'false'` and returns the status so the UI
      can point the user to OS settings (`Linking.openSettings()`).

### Task 3 — Scheduler module (`src/data/notification-scheduler.ts`)
Status: done

- [x] Persisted map under kv-store key `notifications.scheduled`:
      `Record<entityId, Array<{ id: string; kind: 'week' | 'day'; triggerISO: string }>>`.
- [x] `computeDesiredReminders()` — iterate `assignmentsCollection` (status `todo`,
      `dueDate` set) and `examsCollection`; for each, build triggers at **09:00 local**
      on `date - 7d` and `date - 1d` using the same local-date parsing as
      `src/utils/date.ts` (`parseLocalDate`); drop triggers `<= now`.
- [x] Notification content (Hebrew, course name resolved from `coursesCollection`), with
      `data: { entityType, entityId }` in the payload for future tap-navigation.
- [x] `reconcileNotifications()` as described in §3: no-op unless enabled+granted (but
      still *cancel all* if disabled and the map is non-empty); diff, cancel stale,
      schedule missing (date trigger), persist map. Serialized (in-flight guard +
      coalesced follow-up). Also cross-checks `getAllScheduledNotificationsAsync()` each
      run and caps at soonest 60 for the iOS 64-pending limit.
- [x] `disableNotifications()` — cancel all scheduled, clear map, set flag `'false'`.
- [x] Wire-up in `_layout.tsx`: `startNotificationSync()` subscribes to the three
      collections (500ms debounce) + runs once on app start.
- [x] Android: create the notification channel (`setNotificationChannelAsync`) before
      first schedule; date trigger passes `channelId` on Android.

### Task 4 — Onboarding step (`src/app/onboarding.tsx`)
Status: done

- [x] Insert a new **step 7 "התראות"** between the per-course loop (6) and summary
      (now 8); bump `TOTAL_STEPS` to 8, adjust `finish()`/`goBack()` and progress dots.
- [x] Content: headline `🔔 שלא תפספסו הגשה`, one line explaining the reminders, primary
      button `הפעילו תזכורות` (calls `enableNotifications()` on press), secondary
      text-button `אולי אחר כך`.
- [x] Either choice advances to the summary and calls `markPromptSeen()`.
- [x] In `completeOnboarding()`: after the `addMany` flush, `void reconcileNotifications()`.
- [x] If OS permission is denied at this step, don't block — `handleEnableNotifications`
      advances regardless; settings toggle is the recovery path.

### Task 5 — Settings toggle + existing-user prompt
Status: done

- [x] `settings.tsx`: add a `התראות` row with a `Switch` bound to
      `useNotificationsEnabled()`. On → `enableNotifications()` (if OS permission is
      permanently denied, shows Hebrew alert with a button to `Linking.openSettings()`).
      Off → `disableNotifications()`.
- [x] One-time prompt for existing users: on the dashboard (`(tabs)/index.tsx`), when
      `notifications.promptSeen` is unset → dismissible `DashboardCard`: "🔔 רוצים תזכורת
      שבוע ויום לפני כל הגשה ובחינה?" with enable/dismiss. Either action calls
      `markPromptSeen()`. (Onboarding-complete is implicit — the dashboard is behind the
      onboarding route guard.)
- [x] Debug menu (triple-tap in settings): added "התראות מתוזמנות" (prints
      `getAllScheduledNotificationsAsync()` count + next 5 entries) and "תזמן התראות
      מחדש" (`rescheduleAll()`).

### Task 6 — QA checklist (physical device or dev client)
Status: blocked
Blocker: Requires running the app on a physical device / dev client to grant OS
permission and inspect scheduled notifications — cannot be exercised in this environment.
All code paths are implemented and pass `tsc`/`expo lint`; run this checklist on-device.
Note: the `app.json` config-plugin change means a fresh native/dev-client build is needed
for the Android channel + notification icon (iOS local notifications work in the existing
dev client).

- [ ] Create task due in 10 days → exactly 2 scheduled (week & day, both 09:00).
- [ ] Change its due date to 3 days out → week reminder cancelled, day reminder
      rescheduled to the new date.
- [ ] Change due date to today/past → 0 scheduled.
- [ ] Mark done → 0 scheduled; toggle back to todo → reminders return.
- [ ] Delete task / delete exam (all three delete paths) → cancelled.
- [ ] Task without dueDate → nothing scheduled.
- [ ] Onboarding flow: enable at step 7 → after finish, all created items scheduled.
      Skip at step 7 → nothing scheduled, no prompt on dashboard.
- [ ] Existing-user path: with `promptSeen` unset, dashboard shows prompt once.
- [ ] Toggle off in settings → `getAllScheduledNotificationsAsync()` returns []. Toggle
      on → everything back.
- [ ] Debug-menu "reset data" → no orphaned scheduled notifications.
- [ ] Foreground banner shows (notification handler works).
- [ ] Android: channel exists, notification shows with correct icon.
- [ ] Hebrew copy renders correctly in the OS notification shade (RTL).

## 5. Out of scope (possible follow-ups)

- Tapping a notification navigating to the task/exam detail screen (payload already
  carries `entityType`/`entityId`; needs a response listener + `expo-router` navigate).
- User-configurable reminder times/offsets.
- Push notifications from a server (study-group features etc.).
