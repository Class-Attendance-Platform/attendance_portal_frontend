// Refreshing when the user comes back to the tab, window or app (lib/come-back.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { watchComeBack } from '../lib/come-back.ts';

function fakeWeb() {
  const docListeners = new Set();
  const winListeners = { blur: new Set(), focus: new Set() };
  const doc = {
    visibilityState: 'visible',
    addEventListener: (_type, fn) => docListeners.add(fn),
    removeEventListener: (_type, fn) => docListeners.delete(fn),
  };
  const win = {
    addEventListener: (type, fn) => winListeners[type].add(fn),
    removeEventListener: (type, fn) => winListeners[type].delete(fn),
  };
  return {
    source: { kind: 'web', document: doc, window: win },
    blur() {
      for (const fn of [...winListeners.blur]) fn();
    },
    focus() {
      for (const fn of [...winListeners.focus]) fn();
    },
    hideTab() {
      doc.visibilityState = 'hidden';
      for (const fn of [...docListeners]) fn();
    },
    showTab() {
      doc.visibilityState = 'visible';
      for (const fn of [...docListeners]) fn();
    },
  };
}

function fakeApp() {
  const listeners = new Set();
  return {
    source: {
      kind: 'app',
      appState: {
        addEventListener: (_type, fn) => {
          listeners.add(fn);
          return { remove: () => listeners.delete(fn) };
        },
      },
    },
    send(state) {
      for (const fn of [...listeners]) fn(state);
    },
  };
}

test('coming back to the browser tab or window reloads once', () => {
  const web = fakeWeb();
  let calls = 0;
  const stop = watchComeBack(() => {
    calls += 1;
  }, web.source);

  // Switching to another tab fires both blur and visibilitychange; coming back fires both too.
  web.blur();
  web.hideTab();
  assert.equal(calls, 0);
  web.showTab();
  web.focus();
  assert.equal(calls, 1);

  // Switching to another window and back (tab stayed visible).
  web.blur();
  web.focus();
  assert.equal(calls, 2);

  stop();
  web.blur();
  web.focus();
  assert.equal(calls, 2);
});

test('clicking into a window you never left reloads nothing', () => {
  const web = fakeWeb();
  let calls = 0;
  watchComeBack(() => {
    calls += 1;
  }, web.source);

  web.focus();
  web.showTab();
  assert.equal(calls, 0);
});

test('returning to the Android app reloads once, and staying active reloads nothing', () => {
  const app = fakeApp();
  let calls = 0;
  const stop = watchComeBack(() => {
    calls += 1;
  }, app.source);

  app.send('active');
  assert.equal(calls, 0);

  app.send('background');
  app.send('inactive');
  app.send('active');
  app.send('active');
  assert.equal(calls, 1);

  stop();
  app.send('background');
  app.send('active');
  assert.equal(calls, 1);
});
