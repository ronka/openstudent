import * as StoreReview from 'expo-store-review';
import { AppState, Platform } from 'react-native';

import { getItemSync, setItemSync } from '@/data/kv-storage';
import { hasCompletedOnboarding } from '@/data/onboarding';
import {
  isEligibleForReviewPrompt,
  parseReviewPromptState,
  recordAppOpen,
  recordMeaningfulAction,
  recordPromptShown,
  type ReviewPromptState,
} from '@/data/review-prompt';
import { posthog } from '@/utils/analytics';

const STORAGE_KEY = 'reviewPrompt.state';
// Lets a form sheet finish closing, so the system dialog doesn't appear over it.
const PROMPT_DELAY_MS = 1500;

let promptPending = false;

function readState(): ReviewPromptState {
  return parseReviewPromptState(getItemSync(STORAGE_KEY));
}

function writeState(state: ReviewPromptState): void {
  setItemSync(STORAGE_KEY, JSON.stringify(state));
}

function isEligibleNow(): boolean {
  return (
    AppState.currentState === 'active' &&
    isEligibleForReviewPrompt(readState(), { now: new Date(), onboardingComplete: hasCompletedOnboarding() })
  );
}

async function promptIfEligible(): Promise<void> {
  if (!isEligibleNow() || !(await StoreReview.hasAction())) return;
  // Stored before asking, so a failed native call can't re-prompt inside the 90 days.
  writeState(recordPromptShown(readState(), new Date()));
  await StoreReview.requestReview();
  posthog.capture('review_prompt_shown');
}

function schedulePrompt(): void {
  if (Platform.OS === 'web' || promptPending || !isEligibleNow()) return;
  promptPending = true;
  setTimeout(() => {
    promptIfEligible()
      .catch(() => {})
      .finally(() => {
        promptPending = false;
      });
  }, PROMPT_DELAY_MS);
}

function noteAppOpen(): void {
  writeState(recordAppOpen(readState(), new Date()));
  schedulePrompt();
}

/** Call after a course, assignment or grade is added, or a Pomodoro is finished. */
export function noteMeaningfulAction(): void {
  writeState(recordMeaningfulAction(readState()));
  schedulePrompt();
}

/** Counts this launch and every return to the foreground. Returns the cleanup. */
export function startReviewPromptTracking(): () => void {
  noteAppOpen();
  const subscription = AppState.addEventListener('change', (status) => {
    if (status === 'active') noteAppOpen();
  });
  return () => subscription.remove();
}
