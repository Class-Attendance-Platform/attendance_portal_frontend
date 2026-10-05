// How a class day was marked (lib/methods.ts): the same words in every area. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { methodLabel } from '../lib/methods.ts';

test('methodLabel names how a day was marked', () => {
  assert.equal(methodLabel('QR'), 'QR scan');
  assert.equal(methodLabel('CODE'), 'Typed code');
  assert.equal(methodLabel('FACE'), 'Class photo');
  assert.equal(methodLabel('TEACHER'), 'Marked by teacher');
  assert.equal(methodLabel('FINGERPRINT'), 'Device');
});

test('methodLabel is empty when the student did not check in', () => {
  assert.equal(methodLabel(''), '');
  assert.equal(methodLabel(null), '');
  assert.equal(methodLabel(undefined), '');
});
