// Admin page rules (components/admin/rules.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chosenAfterLoad,
  focusAction,
  keepChoice,
  makeTemporaryPassword,
  PASSWORD_CHARS,
  PASSWORD_DIGITS,
  PASSWORD_LETTERS,
  randomIndex,
  takeQuietAnswer,
} from '../components/admin/rules.ts';

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

test('temporary passwords have 10 characters, at least 2 letters and 2 digits, and no look-alikes', () => {
  const letters = new Set(PASSWORD_LETTERS);
  const digits = new Set(PASSWORD_DIGITS);
  const allowed = new Set(PASSWORD_CHARS);
  for (const lookAlike of ['0', 'O', '1', 'l', 'I']) {
    assert.equal(allowed.has(lookAlike), false);
  }
  for (let i = 0; i < 200; i += 1) {
    const password = makeTemporaryPassword();
    assert.equal(password.length, 10);
    let letterCount = 0;
    let digitCount = 0;
    for (const ch of password) {
      assert.equal(allowed.has(ch), true);
      if (letters.has(ch)) letterCount += 1;
      if (digits.has(ch)) digitCount += 1;
    }
    assert.equal(letterCount >= 2, true);
    assert.equal(digitCount >= 2, true);
  }
});

test('randomIndex skips the modulo tail so every character is equally likely', () => {
  // For max = 55, 2^32 % 55 = 16: the top 16 values of Uint32 must be rejected and drawn again.
  const draws = [0xffff_ffff, 0xffff_fff0, 54];
  const pick = randomIndex(55, (values) => {
    values[0] = draws.shift();
  });
  assert.equal(pick, 54);
  assert.equal(draws.length, 0);
});
