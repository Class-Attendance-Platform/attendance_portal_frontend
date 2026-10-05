// Teacher screen rules (components/teacher/rules.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { codeRefetchDelay, CODE_MAX_WAIT_MS, enrolledOn } from '../components/teacher/rules.ts';

test('the code is fetched again just after it changes', () => {
  assert.equal(codeRefetchDelay(2), 2300);
  assert.equal(codeRefetchDelay(0), 1300); // already changing: ask again in a moment
});

test('the code is fetched at least every 5 seconds', () => {
  assert.equal(codeRefetchDelay(30), CODE_MAX_WAIT_MS);
  assert.equal(codeRefetchDelay(5), CODE_MAX_WAIT_MS);
  assert.equal(codeRefetchDelay(Number.NaN), 1300);
});

test('a member from the start who never left is enrolled on every date', () => {
  assert.equal(enrolledOn({ joined_at: null, left_at: null }, '2026-09-01'), true);
});

test('a late joiner counts from the join date', () => {
  const late = { joined_at: '2026-09-18', left_at: null };
  assert.equal(enrolledOn(late, '2026-09-17'), false);
  assert.equal(enrolledOn(late, '2026-09-18'), true);
  assert.equal(enrolledOn(late, '2026-10-05'), true);
});

test('a student who left is not enrolled from the leaving date on', () => {
  const left = { joined_at: null, left_at: '2026-10-01' };
  assert.equal(enrolledOn(left, '2026-09-30'), true);
  assert.equal(enrolledOn(left, '2026-10-01'), false);
});
