// App version check (components/auth/version.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compareVersions, parseVersion, updateStatus } from '../components/auth/version.ts';

test('reads versions with a "v", missing parts and suffixes', () => {
  assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseVersion('v2.0'), [2, 0]);
  assert.deepEqual(parseVersion(' 1.4.0-beta.2 '), [1, 4, 0]);
  assert.equal(parseVersion(''), null);
  assert.equal(parseVersion(null), null);
  assert.equal(parseVersion('latest'), null);
});

test('compares numbers, not text', () => {
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('2', '1.99.99'), 1);
  assert.equal(compareVersions('1.0.0', 'nonsense'), null);
});

test('below the minimum blocks, below the latest suggests an update', () => {
  assert.equal(updateStatus('1.0.0', '1.1.0', '1.2.0'), 'required');
  assert.equal(updateStatus('1.1.0', '1.1.0', '1.2.0'), 'available');
  assert.equal(updateStatus('1.2.0', '1.1.0', '1.2.0'), 'current');
  assert.equal(updateStatus('1.3.0', '1.1.0', '1.2.0'), 'current');
});

test('an unreadable version never locks anyone out', () => {
  assert.equal(updateStatus(null, '9.0.0', '9.0.0'), 'current');
  assert.equal(updateStatus('1.0.0', '', 'x'), 'current');
  assert.equal(updateStatus('1.0.0', 'x', '1.1.0'), 'available');
});
