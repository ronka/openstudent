/**
 * Pushes fresh widget timelines whenever the underlying data changes.
 *
 * Wiring: `initWidgets()` is called once from `src/app/_layout.tsx` (side-effect init,
 * next to `initializeRTL`). It subscribes to the three store collections and to
 * `AppState` foreground events, and re-emits each widget's timeline (debounced, since
 * mutations arrive in bursts via `addMany`).
 *
 * iOS-only: `expo-widgets` has no Android target here and its native module is absent
 * on web, so the widget modules (which import `@expo/ui/swift-ui` + `expo-widgets`) are
 * lazily `require`d *after* the platform check — web/Android bundles never load them.
 */

import { AppState, Platform } from 'react-native';

import { assignmentsCollection, coursesCollection, examsCollection } from '@/data/store';

const DEBOUNCE_MS = 500;

export function initWidgets(): void {
  if (Platform.OS !== 'ios') return;

  /* eslint-disable @typescript-eslint/no-require-imports -- native-only, loaded after the iOS guard */
  const { buildDeadlinesTimeline, buildExamTimeline, buildProgressTimeline } = require('./props') as typeof import('./props');
  const { deadlinesWidget } = require('./deadlines-widget') as typeof import('./deadlines-widget');
  const { examWidget } = require('./exam-widget') as typeof import('./exam-widget');
  const { progressWidget } = require('./progress-widget') as typeof import('./progress-widget');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const refresh = () => {
    const now = new Date();
    const courses = coursesCollection.getSnapshot();
    deadlinesWidget.updateTimeline(buildDeadlinesTimeline(courses, assignmentsCollection.getSnapshot(), now));
    examWidget.updateTimeline(buildExamTimeline(courses, examsCollection.getSnapshot(), now));
    progressWidget.updateTimeline(buildProgressTimeline(courses, now));
  };

  // Coalesce mutation bursts into a single refresh.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      refresh();
    }, DEBOUNCE_MS);
  };

  refresh();
  coursesCollection.subscribe(scheduleRefresh);
  assignmentsCollection.subscribe(scheduleRefresh);
  examsCollection.subscribe(scheduleRefresh);
  // Foregrounding after midnight: recompute "days left" immediately.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') refresh();
  });
}
