/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { DEGREE_CREDITS_TARGET } from './constants';
import { degreeStats } from './stats';
import type { Course } from './types';

test('recognized credits increase degree progress without creating passed courses', () => {
  const passedCourse: Course = {
    id: 'passed-course',
    name: 'Passed course',
    type: 'חובה',
    status: 'passed',
    credits: 6,
    grade: 90,
  };

  const result = degreeStats([passedCourse], { year: 2026, term: 'א' }, 8);

  assert.equal(result.passedCredits, 6);
  assert.equal(result.recognizedCredits, 8);
  assert.equal(result.completedCredits, 14);
  assert.equal(result.passedCount, 1);
  assert.equal(result.degreePct, 14 / DEGREE_CREDITS_TARGET);
});
