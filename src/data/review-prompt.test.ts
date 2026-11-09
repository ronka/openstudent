/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INITIAL_REVIEW_PROMPT_STATE,
  isEligibleForReviewPrompt,
  parseReviewPromptState,
  recordAppOpen,
  recordMeaningfulAction,
  recordPromptShown,
  type ReviewPromptState,
} from './review-prompt';

const day = (date: number, hour = 12) => new Date(2026, 10, date, hour);

function openedOn(...dates: Date[]): ReviewPromptState {
  return dates.reduce(recordAppOpen, INITIAL_REVIEW_PROMPT_STATE);
}

const ready = recordMeaningfulAction(openedOn(day(1), day(2), day(3)));
const now = day(3);

test('eligible after 3 separate days and a meaningful action', () => {
  assert.equal(isEligibleForReviewPrompt(ready, { now, onboardingComplete: true }), true);
});

test('several opens on one day count once', () => {
  const state = openedOn(day(1, 8), day(1, 20), day(1, 23));
  assert.equal(state.openDays, 1);
});

test('local days are counted, not 24 hour periods', () => {
  assert.equal(openedOn(day(1, 23), day(2, 1)).openDays, 2);
});

test('two days is not enough', () => {
  const state = recordMeaningfulAction(openedOn(day(1), day(2)));
  assert.equal(isEligibleForReviewPrompt(state, { now, onboardingComplete: true }), false);
});

test('opening on 3 days without a meaningful action is not enough', () => {
  const state = openedOn(day(1), day(2), day(3));
  assert.equal(isEligibleForReviewPrompt(state, { now, onboardingComplete: true }), false);
});

test('never during onboarding', () => {
  assert.equal(isEligibleForReviewPrompt(ready, { now, onboardingComplete: false }), false);
});

test('at most once every 90 days', () => {
  const shown = recordPromptShown(ready, now);
  const at = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  assert.equal(isEligibleForReviewPrompt(shown, { now: at(1), onboardingComplete: true }), false);
  assert.equal(isEligibleForReviewPrompt(shown, { now: new Date(at(90).getTime() - 1), onboardingComplete: true }), false);
  assert.equal(isEligibleForReviewPrompt(shown, { now: at(90), onboardingComplete: true }), true);
});

test('state survives a storage round trip', () => {
  assert.deepEqual(parseReviewPromptState(JSON.stringify(ready)), ready);
});

test('missing or corrupt storage starts fresh', () => {
  assert.deepEqual(parseReviewPromptState(null), INITIAL_REVIEW_PROMPT_STATE);
  assert.deepEqual(parseReviewPromptState('{not json'), INITIAL_REVIEW_PROMPT_STATE);
});
