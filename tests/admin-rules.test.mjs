// Admin page rules (components/admin/rules.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chosenAfterLoad, focusAction, keepChoice, takeQuietAnswer } from '../components/admin/rules.ts';

test('coming back to a page refreshes it quietly when it shows data', () => {
  assert.equal(focusAction(false, true), 'refresh');
});

test('coming back to an error screen tries again with a normal load', () => {
  assert.equal(focusAction(false, false), 'load');
});

test('coming back while a load still runs refreshes once it answers', () => {
  // that request may have been sent before the admin left
  assert.equal(focusAction(true, true), 'later');
  assert.equal(focusAction(true, false), 'later');
});

test('a quiet answer is used while it is the newest request and nothing changed on screen', () => {
  assert.equal(takeQuietAnswer(4, 4, 2, 2), true);
});

test('a quiet answer is dropped once a newer request started', () => {
  assert.equal(takeQuietAnswer(4, 5, 2, 2), false);
});

test('a quiet answer never undoes a change made on screen after it started', () => {
  // e.g. a sign-up approved and dropped from the list while the refresh was on its way
  assert.equal(takeQuietAnswer(4, 4, 2, 3), false);
});

test('everyone is ticked for promoting until the admin changes the ticks', () => {
  assert.deepEqual([...chosenAfterLoad(['a', 'b', 'c'], null, false)], ['a', 'b', 'c']);
  assert.deepEqual([...chosenAfterLoad(['a', 'b', 'c', 'd'], new Set(['a', 'b', 'c']), false)], ['a', 'b', 'c', 'd']);
});

test("a refresh keeps the admin's ticks, minus students who left", () => {
  const ticked = new Set(['a', 'c', 'x']); // x left the semester elsewhere
  assert.deepEqual([...chosenAfterLoad(['a', 'b', 'c', 'd'], ticked, true)], ['a', 'c']); // d joined: not ticked
  assert.deepEqual([...chosenAfterLoad(['a', 'b'], new Set(), true)], []); // "Select none" stays none
});

test('a choice stays while the reloaded list still offers it', () => {
  assert.equal(keepChoice('s2', ['s1', 's2'], ''), 's2');
  assert.equal(keepChoice('', ['s1'], ''), ''); // nothing chosen
});

test('a choice that dropped out of the reloaded list goes back to none', () => {
  assert.equal(keepChoice('s3', ['s1', 's2'], ''), '');
});
