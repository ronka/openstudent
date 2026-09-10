/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateDegreeAverage } from './calculate-degree-average';
import type { Course } from './types';

function course(overrides: Partial<Course> & Pick<Course, 'id' | 'name'>): Course {
  return {
    type: 'חובה',
    status: 'passed',
    ...overrides,
  };
}

test('calculates a credit-weighted average from final course grades', () => {
  const result = calculateDegreeAverage([
    course({ id: 'six-credit', name: 'Six credit course', credits: 6, grade: 90 }),
    course({ id: 'three-credit', name: 'Three credit course', credits: 3, grade: 80 }),
  ]);

  assert.equal(result.average, 86.66666666666667);
  assert.equal(result.count, 2);
  assert.equal(result.min, 80);
  assert.equal(result.max, 90);
});

test('excludes courses without a final numeric grade and binary-pass courses', () => {
  const result = calculateDegreeAverage([
    course({ id: 'graded', name: 'Graded', credits: 6, grade: 92 }),
    course({ id: 'ungraded', name: 'Ungraded', credits: 6 }),
    course({ id: 'binary', name: 'Binary pass', credits: 6, grade: 100, binaryPass: true }),
  ]);

  assert.deepEqual(result, {
    average: 92,
    min: 92,
    max: 92,
    count: 1,
    grades: [{ courseId: 'graded', title: 'Graded', grade: 92 }],
  });
});

test('returns an empty result when no course has a final grade', () => {
  assert.deepEqual(calculateDegreeAverage([]), {
    average: 0,
    min: 0,
    max: 0,
    count: 0,
    grades: [],
  });
});

test('orders grade-trend entries by academic year and semester', () => {
  const result = calculateDegreeAverage([
    course({ id: 'later', name: 'Later', grade: 90, year: 2025, semester: 'ב' }),
    course({ id: 'earlier', name: 'Earlier', grade: 80, year: 2024, semester: 'ג' }),
    course({ id: 'same-year', name: 'Same year', grade: 85, year: 2025, semester: 'א' }),
  ]);

  assert.deepEqual(
    result.grades.map((grade) => grade.courseId),
    ['earlier', 'same-year', 'later']
  );
});
