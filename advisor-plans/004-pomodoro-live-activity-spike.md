# Plan 004: Spike — is a Pomodoro Live Activity feasible with expo-widgets on SDK 57?

> **Executor instructions**: This is an INVESTIGATION plan. You produce a
> report file, not app code — you must not modify anything under `src/`,
> `app.json`, or `package.json`. Follow the steps, answer every question in
> the deliverable, and honor the STOP conditions. When done, update the
> status row in `advisor-plans/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1b73daf..HEAD -- WIDGETS_PLAN.md src/widgets/`
> If `WIDGETS_PLAN.md` changed materially (e.g. Live Activities are no longer
> "deferred" but decided against, or already built), STOP and report.

## Status

- **Priority**: P3
- **Effort**: M (investigation only; the build itself would be L and is NOT this plan)
- **Risk**: LOW (read-only spike)
- **Depends on**: none to run; the resulting feature would depend on advisor-plans/001-wall-clock-pomodoro-timer.md (the `endAt` timestamp model is exactly what a Live Activity renders)
- **Category**: direction (design/spike)
- **Planned at**: commit `1b73daf`, 2026-07-26

## Why this matters

The project's own widgets plan explicitly deferred this: `WIDGETS_PLAN.md:15` — "No Live Activities in this phase (Pomodoro Live Activity deferred)." — and even noted the config hook it would need (`WIDGETS_PLAN.md:82`: "`enablePushNotifications` omitted — only needed for Live Activities."). A lock-screen / Dynamic Island countdown is the natural end-state for a pomodoro timer — it removes the current keep-the-screen-on-and-stare model entirely. The open question is purely feasibility: does the installed `expo-widgets` (`~57.0.6`) expose Live Activities, and can it render a self-updating countdown without push updates? This spike answers go/no-go with evidence, so the maintainer can decide with facts instead of hope.

## Current state

- `expo-widgets@~57.0.6` is installed and working: three iOS home-screen widgets ship today (`src/widgets/exam-widget.tsx`, `progress-widget.tsx`, `deadlines-widget.tsx`), registered via `createWidget(name, component)` and fed by `src/widgets/updater.ts` (`Widget.updateSnapshot` / `Widget.updateTimeline`, refreshed on data change and AppState foreground).
- `WIDGETS_PLAN.md` records the constraints the team already accepted: iOS only; widgets are `@expo/ui/swift-ui` components compiled to a WidgetKit extension (no JS at render time); CNG setup with no committed `ios/` directory; new native targets cannot ship via OTA and require version-bumped rebuilds (`WIDGETS_PLAN.md:88-90`).
- The pomodoro timer (after plan 001) keeps a wall-clock `endAt` timestamp — the exact value ActivityKit-style countdown text renders natively (iOS can display a live countdown from a date range without any process running).
- Project instructions (`AGENTS.md`) require the Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/ — the expo-widgets page there is the primary source.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Inspect installed API | `grep -rn -i "liveactivity\|activitykit\|ActivityAttributes" node_modules/expo-widgets/build/ node_modules/expo-widgets/*.md 2>/dev/null` | Hits (API exists) or empty (strong no-go signal) |
| Inspect types | `ls node_modules/expo-widgets/build/` then read the `.d.ts` files | Enumerate the exported surface |
| Plugin options | `grep -rn -i "push\|activity" node_modules/expo-widgets/plugin/ 2>/dev/null` | Whether `enablePushNotifications` / activity options exist in the config plugin |

No app build is required; this spike is answered from types, plugin source, and documentation.

## Suggested executor toolkit

- WebFetch/WebSearch (if available): the expo-widgets page under https://docs.expo.dev/versions/v57.0.0/, the package's GitHub README/changelog, and Apple's ActivityKit documentation for the countdown-text capability (`Text(timerInterval:)` / date-range interpolation).

## Scope

**In scope** (writes):

- `advisor-plans/004-live-activity-spike-report.md` (create — the deliverable)
- `advisor-plans/README.md` (status row)

**Out of scope**:

- ANY file under `src/`, `app.json`, `eas.json`, `package.json`, `WIDGETS_PLAN.md`. No prototype code in the repo, no dependency installs, no prebuild.

## Git workflow

- Branch: `advisor/004-live-activity-spike`. One commit with the report. Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Establish what the installed package supports

Run the inspection commands above; read `node_modules/expo-widgets`'s README/types/plugin source. Record exact evidence (file + line) for whether a Live Activity API exists, and under what name/shape.

**Verify**: the report's §1 cites at least one concrete file path in `node_modules/expo-widgets` (or states the search was exhaustive and empty).

### Step 2: Answer the feasibility questions

The report must answer each, with sources:

1. **API**: Does `expo-widgets@57` expose Live Activities (start/update/end from JS)? Under what API? If not: is it on the package's roadmap (changelog/issues), and what is the closest alternative (bare ActivityKit via a custom config plugin / dev-client native module — coarse effort only, do not design it)?
2. **Self-updating countdown**: Can the activity render a countdown natively from `endAt` (ActivityKit timer-interval text) so NO updates are needed while it runs — i.e. `enablePushNotifications` (`WIDGETS_PLAN.md:82`) stays unnecessary for a local-only timer? This is the linchpin: if every displayed second needs a push or JS update, the feature is not worth it.
3. **Lifecycle fit**: Map start/pause/reset/complete (from `src/data/pomodoro-timer.ts` after plan 001) onto activity start/update/end. What happens on pause (no fixed `endAt`) — freeze via update, or end + restart the activity?
4. **Build/ship implications**: Confirm (from `WIDGETS_PLAN.md:88-90` + Expo docs) whether Live Activity support changes the existing widget extension target or adds a new one, and restate the OTA/rebuild consequence. Minimum iOS version required vs. the project's current target (check `app.json` — read-only).
5. **Android**: Is there a comparable "ongoing timer notification" path via the already-installed `expo-notifications` (chronometer-style ongoing notification), or is this iOS-only like the widgets? One paragraph, coarse.

### Step 3: Write the report and verdict

`advisor-plans/004-live-activity-spike-report.md`: §1 evidence, §2 answers (one section per question), §3 a **go / no-go / go-later recommendation** with a coarse effort estimate for the build plan if "go", and §4 open questions that only a prototype build can answer.

**Verify**: every §2 answer cites at least one source (file path or URL); `git status --short` shows only the two in-scope files.

## Test plan

Not applicable (no code). The report IS the artifact; its quality bar: a maintainer can make the go/no-go call without re-doing any of the research.

## Done criteria

- [ ] `advisor-plans/004-live-activity-spike-report.md` exists and answers all 5 questions with cited sources
- [ ] A clear go/no-go/go-later verdict with effort estimate is present
- [ ] `git status --short` — nothing outside `advisor-plans/`
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `WIDGETS_PLAN.md` drift: Live Activities already built or explicitly rejected since commit `1b73daf`.
- You find yourself writing prototype code or modifying config to "just test it" — that is the next plan, not this one; report instead.
- Network access unavailable AND `node_modules/expo-widgets` yields no signal either way — report "insufficient evidence" honestly rather than guessing.

## Maintenance notes

- If the verdict is "go", the follow-up build plan must depend on plan 001 (the `endAt` model) and revisit `WIDGETS_PLAN.md`'s `enablePushNotifications` note; it will require a native rebuild (version bump, no OTA), so it should ride along with the next scheduled binary release.
- If "no-go for now", record the blocking fact in `advisor-plans/README.md` under rejected findings with the evidence, so the question isn't re-spiked every audit.
