// The browser Back/Forward guard behind useLeaveGuard (hooks/leaveGuardHistory.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { watchHistory } from '../hooks/leaveGuardHistory.ts';

/**
 * A small browser: the session history, the Navigation API's navigate event and popstate.
 * expo-router's own popstate listener is added first, to show the guard still runs before it.
 */
function browser({ navigationApi = true } = {}) {
  const entries = ['/teacher', '/teacher/courses/1', '/teacher/courses/1/roll-call', '/account'];
  let index = 2; // on the roll call
  const popstateListeners = [];
  const navigateListeners = [];
  const moves = []; // history.go() calls: browsers make them later, not during the call
  const seenByApp = [];

  popstateListeners.push({ listener: () => seenByApp.push(entries[index]), capture: false });

  function traverse(delta, byPerson) {
    const to = index + delta;
    if (delta === 0 || to < 0 || to >= entries.length) return;
    for (const listener of navigateListeners) {
      listener({ navigationType: 'traverse', userInitiated: byPerson, destination: { index: to } });
    }
    index = to;
    let stopped = false;
    const event = { stopImmediatePropagation: () => (stopped = true) };
    // At the window (the target), capture listeners run first, then the others.
    const ordered = [...popstateListeners.filter((item) => item.capture), ...popstateListeners.filter((item) => !item.capture)];
    for (const { listener } of ordered) {
      if (stopped) break;
      listener(event);
    }
  }

  const win = {
    navigation: navigationApi
      ? {
          get currentEntry() {
            return { index };
          },
          addEventListener: (_type, listener) => navigateListeners.push(listener),
        }
      : undefined,
    history: { go: (delta) => moves.push(delta) },
    addEventListener: (_type, listener, capture) => popstateListeners.push({ listener, capture: !!capture }),
  };

  return {
    win,
    seenByApp,
    get path() {
      return entries[index];
    },
    /** The browser's Back and Forward buttons. */
    back: () => traverse(-1, true),
    forward: () => traverse(1, true),
    /** Lets answered questions and pending history moves run. */
    async settle() {
      for (let round = 0; round < 5; round += 1) {
        await new Promise((resolve) => setImmediate(resolve));
        while (moves.length) traverse(moves.shift(), false);
      }
    },
  };
}

/** A question the test answers: `answers[i](true)` = leave, `(false)` = keep editing. */
function question() {
  const answers = [];
  return { ask: () => new Promise((resolve) => answers.push(resolve)), answers };
}

test('Back on a guarded page keeps the page and asks', async () => {
  const page = browser();
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.back();
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1/roll-call');
  assert.deepEqual(page.seenByApp, []); // expo-router never saw a move
  assert.equal(answers.length, 1);

  answers[0](false); // Keep editing
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1/roll-call');
  assert.deepEqual(page.seenByApp, []);
});

test('choosing to leave makes the move after all', async () => {
  const page = browser();
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.back();
  await page.settle();
  answers[0](true);
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1');
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1']);
});

test('Forward is put back the same way', async () => {
  const page = browser();
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.forward();
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1/roll-call');
  assert.deepEqual(page.seenByApp, []);
  answers[0](true);
  await page.settle();
  assert.equal(page.path, '/account');
  assert.deepEqual(page.seenByApp, ['/account']);
});

test('Back pressed again while asking asks only once', async () => {
  const page = browser();
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.back();
  await page.settle();
  page.back();
  await page.settle();
  assert.equal(answers.length, 1);
  assert.equal(page.path, '/teacher/courses/1/roll-call');
  answers[0](true);
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1');
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1']);
});

test("the app's own history moves go through", async () => {
  const page = browser();
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.win.history.go(-1); // expo-router going back after the question was answered in the app
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1');
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1']);
  assert.equal(answers.length, 0);
});

test('nothing is stopped without a guard or after it is removed', async () => {
  const page = browser();
  const { ask, answers } = question();
  const history = watchHistory(page.win);

  page.back();
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1']);
  page.forward();
  const stop = history.guard(ask);
  stop();
  page.back();
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1', '/teacher/courses/1/roll-call', '/teacher/courses/1']);
  assert.equal(answers.length, 0);
});

test('a page that is gone while asking does not move', async () => {
  const page = browser();
  const { ask, answers } = question();
  const stop = watchHistory(page.win).guard(ask);

  page.back();
  await page.settle();
  stop(); // e.g. signed out meanwhile: the app has already moved on
  answers[0](true);
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1/roll-call');
  assert.deepEqual(page.seenByApp, []);
});

test('without the Navigation API nothing is stopped', async () => {
  const page = browser({ navigationApi: false });
  const { ask, answers } = question();
  watchHistory(page.win).guard(ask);

  page.back();
  await page.settle();
  assert.equal(page.path, '/teacher/courses/1');
  assert.deepEqual(page.seenByApp, ['/teacher/courses/1']);
  assert.equal(answers.length, 0);
});
