// Token refresh with several tabs (lib/api/refresh-core.ts). Run: npm test
// A fake server rotates refresh tokens like the backend (a used token is blacklisted at once,
// the answer may come later); the "tabs" share one fake localStorage.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { afterRefused, newestTokens, ownSaved, refreshTokens, tokenExpiresAt } from '../lib/api/refresh-core.ts';

const HOUR = 3600_000;

function jwt(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

function makeClock(start = Date.UTC(2026, 9, 5, 4, 0, 0)) {
  let now = start;
  return { now: () => now, advance: (ms) => (now += ms) };
}

function makeServer(clock) {
  let count = 0;
  const valid = new Map(); // refresh token -> user id
  const calls = [];
  const holds = new Map(); // refresh token -> promise the answer waits for
  const server = {
    calls,
    issue(userId, { expired = false } = {}) {
      count += 1;
      const exp = Math.floor((clock.now() + (expired ? -60_000 : HOUR)) / 1000);
      const pair = { access: jwt({ exp, n: count, userId }), refresh: `refresh-${count}` };
      valid.set(pair.refresh, userId);
      return pair;
    },
    isValid: (refresh) => valid.has(refresh),
    blacklist: (refresh) => valid.delete(refresh),
    hold(refresh) {
      const gate = deferred();
      holds.set(refresh, gate.promise);
      return gate.resolve;
    },
    async refresh(token) {
      calls.push(token);
      // A hold applies to the next request with that token only.
      const gate = holds.get(token);
      holds.delete(token);
      await Promise.resolve();
      const userId = valid.get(token);
      // Checked and rotated when the request arrives; the answer can be held back.
      const pair = userId ? (valid.delete(token), server.issue(userId)) : null;
      if (gate) await gate;
      if (!pair) throw Object.assign(new Error('401'), { response: { status: 401 } });
      return pair;
    },
  };
  return server;
}

function makeStorage() {
  let value = null;
  const listeners = new Set();
  return {
    get: () => (value ? { ...value } : null),
    set(next) {
      value = next ? { ...next } : null;
      for (const listener of [...listeners]) listener();
    },
    waitForChange(ms) {
      return new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          listeners.delete(done);
          resolve();
        };
        const timer = setTimeout(done, ms);
        listeners.add(done);
      });
    },
  };
}

function makeLock() {
  let chain = Promise.resolve();
  return (task) => {
    const run = chain.then(() => task());
    chain = run.catch(() => {});
    return run;
  };
}

/** One browser tab: its own memory, the shared storage, server, lock and clock. */
function makeTab({ storage, server, clock, lock = null, userId = 'user-1', tokens = storage.get() }) {
  const tab = { access: tokens?.access ?? null, refresh: tokens?.refresh ?? null, owner: userId, generation: 0 };
  tab.env = {
    getTokens: () => ({ access: tab.access, refresh: tab.refresh }),
    setTokens: (access, refresh) => {
      tab.access = access;
      tab.refresh = refresh;
    },
    owner: () => tab.owner,
    readSaved: () => storage.get(),
    save: async (access, refresh) => {
      const saved = storage.get();
      // Like updateSession({onlyIfSaved, userId}).
      if (!saved || (tab.owner && saved.userId && saved.userId !== tab.owner)) return;
      storage.set({ ...saved, access, refresh });
    },
    send: (refresh) => server.refresh(refresh),
    revoke: ({ refresh }) => server.blacklist(refresh),
    generation: () => tab.generation,
    lock,
    waitForOtherTab: () => storage.waitForChange(200),
    now: clock.now,
  };
  tab.signOut = () => {
    tab.generation += 1;
    tab.access = null;
    tab.refresh = null;
  };
  return tab;
}

/** A saved login whose access token has expired (the usual reason for a refresh). */
function setup({ withLock }) {
  const clock = makeClock();
  const server = makeServer(clock);
  const storage = makeStorage();
  storage.set({ userId: 'user-1', ...server.issue('user-1', { expired: true }) });
  const lock = withLock ? makeLock() : null;
  return { clock, server, storage, lock };
}

test('two tabs refreshing at once with Web Locks: both stay signed in, one server call', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const a = makeTab({ storage, server, clock, lock });
  const b = makeTab({ storage, server, clock, lock });

  const [resultA, resultB] = await Promise.all([refreshTokens(a.env), refreshTokens(b.env)]);

  assert.deepEqual(resultA, { ok: true });
  assert.deepEqual(resultB, { ok: true });
  assert.equal(server.calls.length, 1, 'the second tab takes the pair the first one saved');
  const saved = storage.get();
  assert.ok(server.isValid(saved.refresh), 'the saved refresh token still works');
  assert.equal(a.refresh, saved.refresh);
  assert.equal(b.refresh, saved.refresh);
});

test('without Web Locks the tab that loses the race waits for the other tab and retries', async () => {
  const { clock, server, storage } = setup({ withLock: false });
  const first = storage.get().refresh;
  const a = makeTab({ storage, server, clock });
  const b = makeTab({ storage, server, clock });

  // B's request reaches the server first, but its answer is slow; A's then gets a 401.
  const releaseB = server.hold(first);
  const pendingB = refreshTokens(b.env);
  await new Promise((r) => setTimeout(r, 5));
  const pendingA = refreshTokens(a.env);
  await new Promise((r) => setTimeout(r, 20));
  releaseB();

  assert.deepEqual(await pendingB, { ok: true });
  assert.deepEqual(await pendingA, { ok: true }, 'A is not signed out');
  const saved = storage.get();
  assert.ok(saved, 'the saved login is kept');
  assert.ok(server.isValid(saved.refresh));
  assert.equal(a.refresh, saved.refresh);
});

test('a refused token with nothing newer saved ends the login', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const refused = storage.get().refresh;
  server.blacklist(refused);
  const tab = makeTab({ storage, server, clock, lock });

  assert.deepEqual(await refreshTokens(tab.env), { ok: false, expired: refused });
  assert.equal(afterRefused(storage.get(), refused, 'user-1'), 'clear');
});

test('network errors keep the login', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const tab = makeTab({ storage, server, clock, lock });
  tab.env.send = async () => {
    throw new Error('Network Error');
  };
  assert.deepEqual(await refreshTokens(tab.env), { ok: false, expired: null });
  assert.ok(storage.get());
});

test('a fresh pair saved by another tab is used without calling the server', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const tab = makeTab({ storage, server, clock, lock });
  const newer = server.issue('user-1');
  storage.set({ userId: 'user-1', ...newer });

  assert.deepEqual(await refreshTokens(tab.env), { ok: true });
  assert.equal(server.calls.length, 0);
  assert.equal(tab.access, newer.access);
  assert.equal(tab.refresh, newer.refresh);
});

test('a saved pair with an expired access token is refreshed with the saved refresh token', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const tab = makeTab({ storage, server, clock, lock });
  const newer = server.issue('user-1', { expired: true });
  storage.set({ userId: 'user-1', ...newer });

  assert.deepEqual(await refreshTokens(tab.env), { ok: true });
  assert.deepEqual(server.calls, [newer.refresh]);
  assert.equal(storage.get().refresh, tab.refresh);
});

test('a refresh that finishes after a sign-out is thrown away and blacklisted', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const sent = storage.get().refresh;
  const tab = makeTab({ storage, server, clock, lock });
  const release = server.hold(sent);
  const pending = refreshTokens(tab.env);
  await new Promise((r) => setTimeout(r, 5));

  // Signed out in another tab: the storage listener ends this tab's session.
  storage.set(null);
  tab.signOut();
  release();

  assert.deepEqual(await pending, { ok: false, expired: null });
  assert.equal(tab.refresh, null, 'the tab does not sign itself back in');
  assert.equal(storage.get(), null);
  assert.equal(server.calls.length, 1);
  const issued = `refresh-${Number(sent.split('-')[1]) + 1}`;
  assert.equal(server.isValid(issued), false, 'the new refresh token is blacklisted');
});

test('a refresh that finishes after a new sign-in in this tab does not replace the new login', async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const sent = storage.get().refresh;
  const tab = makeTab({ storage, server, clock, lock });
  const release = server.hold(sent);
  const pending = refreshTokens(tab.env);
  await new Promise((r) => setTimeout(r, 5));

  const login = server.issue('user-1');
  tab.env.setTokens(login.access, login.refresh);
  release();

  assert.deepEqual(await pending, { ok: false, expired: null });
  assert.equal(tab.refresh, login.refresh);
});

test("another account's saved login is never used or overwritten", async () => {
  const { clock, server, storage, lock } = setup({ withLock: true });
  const own = storage.get();
  const tab = makeTab({ storage, server, clock, lock });
  const other = server.issue('user-2');
  storage.set({ userId: 'user-2', ...other });

  assert.deepEqual(await refreshTokens(tab.env), { ok: true });
  assert.deepEqual(server.calls, [own.refresh], "refreshed with the tab's own token");
  assert.deepEqual(storage.get(), { userId: 'user-2', ...other }, 'the other login is untouched');
  assert.ok(server.isValid(other.refresh));
});

test('afterRefused: adopt a newer login of the same user, leave another account alone', () => {
  const saved = { userId: 'user-1', access: 'a2', refresh: 'r2' };
  assert.equal(afterRefused(saved, 'r1', 'user-1'), 'adopt');
  assert.equal(afterRefused(saved, 'r2', 'user-1'), 'clear');
  assert.equal(afterRefused(null, 'r1', 'user-1'), 'clear');
  assert.equal(afterRefused({ ...saved, userId: 'user-2' }, 'r1', 'user-1'), 'leave');
});

test('newestTokens: sign-out blacklists the pair another tab rotated, never another account', () => {
  const memory = { access: 'a1', refresh: 'r1' };
  assert.deepEqual(newestTokens({ userId: 'user-1', access: 'a2', refresh: 'r2' }, 'user-1', memory), {
    access: 'a2',
    refresh: 'r2',
  });
  assert.deepEqual(newestTokens({ userId: 'user-2', access: 'b', refresh: 'rb' }, 'user-1', memory), memory);
  assert.deepEqual(newestTokens(null, 'user-1', memory), memory);
  assert.equal(ownSaved({ userId: 'user-1', access: 'a', refresh: null }, 'user-1'), null);
});

test('tokenExpiresAt reads the exp claim and survives junk', () => {
  assert.equal(tokenExpiresAt(jwt({ exp: 1_800_000_000 })), 1_800_000_000_000);
  assert.equal(tokenExpiresAt('not-a-jwt'), null);
  assert.equal(tokenExpiresAt('a.%%%.c'), null);
  assert.equal(tokenExpiresAt(null), null);
});
