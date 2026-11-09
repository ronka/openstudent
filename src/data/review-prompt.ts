/**
 * Gating rules for the store review prompt. Pure on purpose: the clock and state are
 * passed in, and `src/utils/store-review.ts` owns storage and the native call.
 */

export const REVIEW_MIN_OPEN_DAYS = 3;
export const REVIEW_COOLDOWN_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewPromptState {
  /** Number of separate local calendar days the app has been opened on. */
  openDays: number;
  lastOpenDay: string | null;
  hasMeaningfulAction: boolean;
  lastPromptAt: number | null;
}

export const INITIAL_REVIEW_PROMPT_STATE: ReviewPromptState = {
  openDays: 0,
  lastOpenDay: null,
  hasMeaningfulAction: false,
  lastPromptAt: null,
};

export function parseReviewPromptState(raw: string | null): ReviewPromptState {
  if (!raw) return INITIAL_REVIEW_PROMPT_STATE;
  try {
    return { ...INITIAL_REVIEW_PROMPT_STATE, ...(JSON.parse(raw) as Partial<ReviewPromptState>) };
  } catch {
    return INITIAL_REVIEW_PROMPT_STATE;
  }
}

function localDayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function recordAppOpen(state: ReviewPromptState, now: Date): ReviewPromptState {
  const day = localDayKey(now);
  if (state.lastOpenDay === day) return state;
  return { ...state, openDays: state.openDays + 1, lastOpenDay: day };
}

export function recordMeaningfulAction(state: ReviewPromptState): ReviewPromptState {
  return state.hasMeaningfulAction ? state : { ...state, hasMeaningfulAction: true };
}

export function recordPromptShown(state: ReviewPromptState, now: Date): ReviewPromptState {
  return { ...state, lastPromptAt: now.getTime() };
}

export function isEligibleForReviewPrompt(
  state: ReviewPromptState,
  { now, onboardingComplete }: { now: Date; onboardingComplete: boolean },
): boolean {
  if (!onboardingComplete) return false;
  if (state.openDays < REVIEW_MIN_OPEN_DAYS || !state.hasMeaningfulAction) return false;
  return state.lastPromptAt === null || now.getTime() - state.lastPromptAt >= REVIEW_COOLDOWN_DAYS * DAY_MS;
}
