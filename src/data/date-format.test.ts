/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDisplayDate } from '@/utils/date';

test('formats ISO dates in Hebrew with day, month name and year', () => {
  assert.equal(formatDisplayDate('2026-12-06'), '6 בדצמבר 2026');
  assert.equal(formatDisplayDate('2026-01-31'), '31 בינואר 2026');
});

test('no timezone off-by-one, east or west of UTC', () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ['America/Los_Angeles', 'UTC', 'Asia/Jerusalem', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      assert.equal(formatDisplayDate('2026-12-06'), '6 בדצמבר 2026', tz);
      assert.equal(formatDisplayDate('2026-01-01'), '1 בינואר 2026', tz);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('empty input gives an empty string', () => {
  assert.equal(formatDisplayDate(''), '');
  assert.equal(formatDisplayDate(undefined), '');
  assert.equal(formatDisplayDate(null), '');
});

test('invalid input is returned unchanged rather than hidden', () => {
  assert.equal(formatDisplayDate('not a date'), 'not a date');
  assert.equal(formatDisplayDate('2026-02-31'), '2026-02-31');
  assert.equal(formatDisplayDate('2026-13-01'), '2026-13-01');
  assert.equal(formatDisplayDate('6/12/2026'), '6/12/2026');
});
