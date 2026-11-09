/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSemester, getCurrentSemester, isBetweenSemesters, isCurrentSemester, migratedSemesterYear } from './semester';

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);
const name = (date: Date) => formatSemester(getCurrentSemester(date));

test('Nov 2026 is 2027א', () => {
  assert.equal(name(at(2026, 11, 9)), '2027א');
});

test('Oct 24 is still summer and Oct 25 starts 2027א', () => {
  assert.equal(name(at(2026, 10, 24)), '2026ג');
  assert.equal(name(at(2026, 10, 25)), '2027א');
});

test('Oct 25 to 31 is never summer', () => {
  for (let day = 25; day <= 31; day += 1) {
    assert.equal(getCurrentSemester(at(2026, 10, day)).term, 'א');
  }
});

test('the boundary holds at the first and last moment of the day', () => {
  assert.equal(name(new Date(2026, 9, 24, 23, 59, 59)), '2026ג');
  assert.equal(name(new Date(2026, 9, 25, 0, 0, 0)), '2027א');
});

test('2027א runs across the new year', () => {
  assert.equal(name(at(2026, 12, 31)), '2027א');
  assert.equal(name(at(2027, 1, 1)), '2027א');
});

test('Jan 31 is the last day of א and Feb 1 starts the break', () => {
  assert.equal(name(at(2027, 1, 31)), '2027א');
  assert.equal(isBetweenSemesters(at(2027, 1, 31)), false);
  assert.equal(name(at(2027, 2, 1)), '2027ב');
  assert.equal(isBetweenSemesters(at(2027, 2, 1)), true);
});

test('Mar 6 is still the break and Mar 7 starts 2027ב', () => {
  assert.equal(name(at(2027, 3, 6)), '2027ב');
  assert.equal(isBetweenSemesters(at(2027, 3, 6)), true);
  assert.equal(name(at(2027, 3, 7)), '2027ב');
  assert.equal(isBetweenSemesters(at(2027, 3, 7)), false);
});

test('summer runs from Jul 1, in the same academic year as ב', () => {
  assert.equal(name(at(2027, 6, 30)), '2027ב');
  assert.equal(name(at(2027, 7, 1)), '2027ג');
  assert.equal(name(at(2027, 8, 15)), '2027ג');
  assert.equal(isBetweenSemesters(at(2027, 8, 15)), false);
});

test('a 2027א course is current in Nov 2026', () => {
  const current = getCurrentSemester(at(2026, 11, 9));
  assert.equal(isCurrentSemester({ year: 2027, semester: 'א' }, current), true);
  assert.equal(isCurrentSemester({ year: 2026, semester: 'א' }, current), false);
});

const idAt = (date: Date) => `c-${date.getTime()}-0`;

test('moves a course saved with the old default for this semester', () => {
  const course = { id: idAt(at(2026, 11, 2)), year: 2026, semester: 'א' as const };
  assert.equal(migratedSemesterYear(course), 2027);
});

test('moves a course saved with the old default in Jan and Feb', () => {
  assert.equal(migratedSemesterYear({ id: idAt(at(2026, 1, 15)), year: 2025, semester: 'א' }), 2026);
  assert.equal(migratedSemesterYear({ id: idAt(at(2026, 2, 15)), year: 2025, semester: 'א' }), 2026);
});

test('migration is idempotent', () => {
  const id = idAt(at(2026, 11, 2));
  assert.equal(migratedSemesterYear({ id, year: 2027, semester: 'א' }), undefined);
});

test('leaves years a student could have chosen by hand', () => {
  assert.equal(migratedSemesterYear({ id: idAt(at(2026, 11, 2)), year: 2025, semester: 'א' }), undefined);
  assert.equal(migratedSemesterYear({ id: idAt(at(2026, 9, 2)), year: 2026, semester: 'א' }), undefined);
});

test('leaves other terms, graded courses and unrecognized ids', () => {
  const id = idAt(at(2026, 11, 2));
  assert.equal(migratedSemesterYear({ id, year: 2026, semester: 'ב' }), undefined);
  assert.equal(migratedSemesterYear({ id, year: 2026, semester: 'א', grade: 90 }), undefined);
  assert.equal(migratedSemesterYear({ id: 'imported', year: 2026, semester: 'א' }), undefined);
});
