// Percent shown to people (lib/percent.ts, re-exported by lib/format.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPercent } from '../lib/percent.ts';

test('formatPercent never rounds up to the minimum', () => {
  assert.equal(formatPercent(74.5), '74%');
  assert.equal(formatPercent(74.9), '74%');
  assert.equal(formatPercent(75), '75%');
  assert.equal(formatPercent(100), '100%');
  assert.equal(formatPercent(0), '0%');
});

test('formatPercent keeps whole values whole despite float error', () => {
  assert.equal(formatPercent(58.0), '58%');
  assert.equal(formatPercent(0.58 * 100), '58%'); // 57.99999999999999
  assert.equal(formatPercent(33.3, 1), '33.3%');
  assert.equal(formatPercent(74.56, 1), '74.5%');
});

test('formatPercent shows a dash without classes', () => {
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(undefined), '—');
  assert.equal(formatPercent(Number.NaN), '—');
});
