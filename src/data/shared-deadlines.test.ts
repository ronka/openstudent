/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSharedDeadlines,
  getDueDateWindow,
  isDueDateInSemester,
  isRealDate,
  mergeWithLocal,
  parseSharedDeadlines,
  resolveCourseSemester,
  validateDeadlineVote,
  type DeadlineVote,
  type SharedDeadline,
} from './shared-deadlines';
import { getSemesterRange } from './semester';

const now = new Date(2026, 10, 22, 12); // 2026-11-22, i.e. 2027א
const valid = { courseNumber: '20441', year: 2027, semester: 'א', type: 'MAMAN', taskNumber: 11, dueDate: '2026-12-01' };

test('semester ranges follow the calendar', () => {
  assert.deepEqual(getSemesterRange(2027, 'א'), { start: '2026-10-25', end: '2027-01-31' });
  assert.deepEqual(getSemesterRange(2027, 'ב'), { start: '2027-03-07', end: '2027-06-30' });
  assert.deepEqual(getSemesterRange(2027, 'ג'), { start: '2027-07-01', end: '2027-10-24' });
});

test('due date window is the semester ± 30 days', () => {
  assert.deepEqual(getDueDateWindow(2027, 'א'), { min: '2026-09-25', max: '2027-03-02' });
  assert.ok(isDueDateInSemester('2027-02-20', 2027, 'א'));
  assert.ok(!isDueDateInSemester('2027-04-15', 2027, 'א'));
  assert.ok(!isDueDateInSemester('2026-08-01', 2027, 'א'));
});

test('isRealDate rejects impossible and malformed dates', () => {
  assert.ok(isRealDate('2027-02-28'));
  assert.ok(!isRealDate('2027-02-30'));
  assert.ok(!isRealDate('2027-13-01'));
  assert.ok(!isRealDate('27-1-1'));
  assert.ok(!isRealDate(20270101));
});

test('a valid vote passes', () => {
  const result = validateDeadlineVote(valid, { now });
  assert.equal(result.ok, true);
});

test('rejects bad type, number range, course number, semester and year', () => {
  const bad = (patch: object) => validateDeadlineVote({ ...valid, ...patch }, { now }).ok;
  assert.equal(bad({ type: 'EXAM' }), false);
  assert.equal(bad({ taskNumber: 5 }), false); // 1–20 style numbers are not valid
  assert.equal(bad({ taskNumber: 21 }), false); // ממ״ח number on a ממ״נ
  assert.equal(bad({ type: 'MAMACH', taskNumber: 21 }), true);
  assert.equal(bad({ type: 'MAMACH', taskNumber: 19 }), false);
  assert.equal(bad({ taskNumber: 11.5 }), false);
  assert.equal(bad({ courseNumber: 'abc' }), false);
  assert.equal(bad({ courseNumber: '123' }), false);
  assert.equal(bad({ courseNumber: '123456' }), false);
  assert.equal(bad({ semester: 'ד' }), false);
  assert.equal(bad({ year: 1999 }), false);
  assert.equal(bad({ year: 2040 }), false);
  assert.equal(bad({ year: '2027' }), false);
  assert.equal(bad({ dueDate: '2027-02-30' }), false);
  assert.equal(bad({ dueDate: '2030-01-01' }), false);
  assert.equal(validateDeadlineVote(null, { now }).ok, false);
});

test('unknown catalog courses are rejected when a catalog check is supplied', () => {
  const result = validateDeadlineVote(valid, { now, isKnownCourse: () => false });
  assert.equal(result.ok, false);
});

const vote = (voterId: string, dueDate: string, updatedAt: number, taskNumber = 11): DeadlineVote => ({
  type: 'MAMAN',
  taskNumber,
  dueDate,
  voterId,
  updatedAt,
});

test('winner is the date with the most confirmations', () => {
  const [item] = buildSharedDeadlines([
    vote('a', '2026-12-01', 1),
    vote('b', '2026-12-08', 2),
    vote('c', '2026-12-08', 3),
  ]);
  assert.equal(item.dueDate, '2026-12-08');
  assert.equal(item.confirmations, 2);
  assert.deepEqual(item.alternatives, [{ dueDate: '2026-12-01', confirmations: 1 }]);
});

test('ties go to the earliest date, regardless of vote order', () => {
  const votes = [vote('a', '2026-12-08', 5), vote('b', '2026-12-01', 1)];
  assert.equal(buildSharedDeadlines(votes)[0].dueDate, '2026-12-01');
  assert.equal(buildSharedDeadlines([...votes].reverse())[0].dueDate, '2026-12-01');
});

test('a changed vote moves the install and is never double-counted', () => {
  const [item] = buildSharedDeadlines([
    vote('a', '2026-12-01', 1),
    vote('b', '2026-12-01', 2),
    vote('a', '2026-12-15', 10), // a changes their mind
  ]);
  // a now backs 12-15; b still backs 12-01: 1–1 tie → earliest.
  assert.equal(item.dueDate, '2026-12-01');
  assert.equal(item.confirmations, 1);
  assert.deepEqual(item.alternatives, [{ dueDate: '2026-12-15', confirmations: 1 }]);
});

test('the latest vote wins even if rows arrive out of order', () => {
  const [item] = buildSharedDeadlines([vote('a', '2026-12-15', 10), vote('a', '2026-12-01', 1)]);
  assert.equal(item.dueDate, '2026-12-15');
  assert.equal(item.confirmations, 1);
});

test('items are separate per type and number and sorted ממ״נ first', () => {
  const result = buildSharedDeadlines([
    { type: 'MAMACH', taskNumber: 21, dueDate: '2027-01-10', voterId: 'a', updatedAt: 1 },
    vote('a', '2026-12-08', 1, 12),
    vote('a', '2026-12-01', 1, 11),
  ]);
  assert.deepEqual(
    result.map((r) => `${r.type}${r.taskNumber}`),
    ['MAMAN11', 'MAMAN12', 'MAMACH21']
  );
});

const shared = (type: 'MAMAN' | 'MAMACH', taskNumber: number): SharedDeadline => ({
  type,
  taskNumber,
  dueDate: '2026-12-01',
  confirmations: 1,
  alternatives: [],
});

test('merge offers only items the student does not already have', () => {
  const offered = mergeWithLocal(
    [shared('MAMAN', 11), shared('MAMAN', 12), shared('MAMACH', 21)],
    [{ type: 'MAMAN', taskNumber: 11 }]
  );
  assert.deepEqual(
    offered.map((o) => `${o.type}${o.taskNumber}`),
    ['MAMAN12', 'MAMACH21']
  );
});

test('merge matches on type as well as number', () => {
  const offered = mergeWithLocal([shared('MAMACH', 21)], [{ type: 'MAMAN', taskNumber: 21 }]);
  assert.equal(offered.length, 1);
});

test('merge offers nothing when everything exists locally', () => {
  assert.deepEqual(mergeWithLocal([shared('MAMAN', 11)], [{ type: 'MAMAN', taskNumber: 11 }]), []);
});

test('course semester falls back to the current one', () => {
  assert.deepEqual(resolveCourseSemester({ year: 2027, semester: 'ב' }, now), { year: 2027, semester: 'ב' });
  assert.deepEqual(resolveCourseSemester({}, now), { year: 2027, semester: 'א' });
});

test('parse drops malformed entries and tolerates garbage', () => {
  assert.deepEqual(parseSharedDeadlines('<html>'), []);
  assert.deepEqual(parseSharedDeadlines({ deadlines: 'nope' }), []);
  const parsed = parseSharedDeadlines({
    deadlines: [
      { type: 'MAMAN', taskNumber: 12, dueDate: '2026-12-01', confirmations: 3, alternatives: [] },
      { type: 'MAMAN', taskNumber: 3, dueDate: '2026-12-01', confirmations: 1 },
      { type: 'MAMAN', taskNumber: 11, dueDate: 'soon', confirmations: 1 },
      null,
    ],
  });
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].confirmations, 3);
});

test('accepted shared deadlines become normal dated assignments with unique ids', async () => {
  const { buildAssignmentsFromShared } = await import('./shared-deadlines');
  const built = buildAssignmentsFromShared('c-1', [shared('MAMAN', 11), shared('MAMACH', 21)], 1000);
  assert.equal(built.length, 2);
  assert.equal(new Set(built.map((a) => a.id)).size, 2);
  assert.deepEqual(
    built.map((a) => [a.name, a.status, a.dueDate, a.courseId]),
    [
      ['ממ״נ 11', 'todo', '2026-12-01', 'c-1'],
      ['ממ״ח 21', 'todo', '2026-12-01', 'c-1'],
    ]
  );
});
