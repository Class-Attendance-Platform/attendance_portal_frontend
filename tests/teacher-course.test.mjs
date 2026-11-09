// Course page rules (components/teacher/rules.ts): live notice checks, "Left" notes. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LIVE_CHECK_MS, liveCheckDelay, shownLeftAt } from '../components/teacher/rules.ts';

test('the live session is checked again just after its time is up', () => {
  assert.equal(liveCheckDelay(5), 7000);
  assert.equal(liveCheckDelay(0), 2000);
  assert.equal(liveCheckDelay(-3), 2000);
});

test('the live session is checked at least every 20 seconds', () => {
  assert.equal(liveCheckDelay(600), LIVE_CHECK_MS);
  assert.equal(liveCheckDelay(null), LIVE_CHECK_MS);
  assert.equal(liveCheckDelay(undefined), LIVE_CHECK_MS);
  assert.equal(liveCheckDelay(Number.NaN), LIVE_CHECK_MS);
});

test('in a running semester leaving is a removal: always shown', () => {
  assert.equal(shownLeftAt('2026-10-10', '2026-10-09', true), '2026-10-10');
  assert.equal(shownLeftAt('2026-10-01', null, true), '2026-10-01');
  assert.equal(shownLeftAt(null, '2026-10-09', true), null);
});

test('in a finished semester "Left" shows when a class was held on or after the leaving date', () => {
  assert.equal(shownLeftAt('2026-08-01', '2026-08-19', false), '2026-08-01');
  assert.equal(shownLeftAt('2026-08-19', '2026-08-19', false), '2026-08-19');
});

test('a promotion after the last class is not shown as leaving', () => {
  assert.equal(shownLeftAt('2026-08-28', '2026-08-19', false), null);
  assert.equal(shownLeftAt('2026-08-28', null, false), null);
  assert.equal(shownLeftAt('2026-08-28', undefined, false), null);
  assert.equal(shownLeftAt(null, '2026-08-19', false), null);
});
