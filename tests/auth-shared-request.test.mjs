// One profile request for the start-up refresh and the account page (lib/shared-request.ts,
// used by hooks/AuthContext.tsx refreshUser). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sharedRequest } from '../lib/shared-request.ts';

/** A fake clock and a counted loader whose answers the test settles by hand. */
function setup(reuseMs = 5000) {
  let time = 1000;
  const calls = [];
  const ask = sharedRequest(reuseMs, () => time);
  const load = () =>
    new Promise((resolve, reject) => {
      calls.push({ resolve, reject });
    });
  return {
    ask: (key) => ask(key, load),
    calls,
    wait: (ms) => {
      time += ms;
    },
  };
}

test('a second ask while the first request runs shares it', async () => {
  const { ask, calls } = setup();
  const first = ask(0);
  const second = ask(0);
  assert.equal(calls.length, 1);
  assert.equal(first, second);
  calls[0].resolve('profile');
  assert.equal(await second, 'profile');
});

test('an answer that just came is used again: the account page opened at start-up sends no second request', async () => {
  const { ask, calls, wait } = setup();
  const startUp = ask(0);
  calls[0].resolve('profile');
  await startUp;
  wait(30); // the account page mounts right after the start-up answer
  assert.equal(await ask(0), 'profile');
  assert.equal(calls.length, 1);
});

test('after a few seconds the next ask loads again', async () => {
  const { ask, calls, wait } = setup();
  const first = ask(0);
  calls[0].resolve('old');
  await first;
  wait(5000);
  const next = ask(0);
  assert.equal(calls.length, 2);
  calls[1].resolve('new');
  assert.equal(await next, 'new');
});

test('a failed request is not used again', async () => {
  const { ask, calls } = setup();
  const first = ask(0);
  calls[0].reject(new Error('offline'));
  await assert.rejects(first, /offline/);
  const again = ask(0);
  assert.equal(calls.length, 2);
  calls[1].resolve('profile');
  assert.equal(await again, 'profile');
});

test('after a sign-out (a new key) nothing is shared', async () => {
  const { ask, calls } = setup();
  const before = ask(0);
  const after = ask(1);
  assert.equal(calls.length, 2);
  assert.notEqual(before, after);
  calls[0].resolve('old login');
  calls[1].resolve('new login');
  assert.equal(await after, 'new login');
  // the old key's answer does not come back for the new key either
  assert.equal(await ask(1), 'new login');
  assert.equal(calls.length, 2);
});

test("an older request that fails late does not drop the newer one's answer", async () => {
  const { ask, calls } = setup();
  const old = ask(0);
  const fresh = ask(1);
  calls[1].resolve('profile');
  await fresh;
  calls[0].reject(new Error('late'));
  await assert.rejects(old, /late/);
  assert.equal(await ask(1), 'profile');
  assert.equal(calls.length, 2);
});
