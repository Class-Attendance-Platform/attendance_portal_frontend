// Why a refresh failed and why a login ended (lib/api/refresh-core.ts). Run: npm test
// Signed out by the server: the user is told its reason (password changed, account disabled).
// Only the refresh call failed (no network, server down): the login stays and that error is shown,
// not the first 401's "Please sign in again".
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { refreshTokens, signOutReason } from '../lib/api/refresh-core.ts';

/** An error like axios's for an HTTP answer. */
function httpError(status, data = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

/** A phone, or a browser without Web Locks, holding refresh-1; `send` answers POST /auth/refresh/. */
function device({ send, readSaved = () => null }) {
  let tokens = { access: 'access-1', refresh: 'refresh-1' };
  return {
    tokens: () => tokens,
    env: {
      getTokens: () => tokens,
      setTokens: (access, refresh) => {
        tokens = { access, refresh };
      },
      owner: () => 'user-1',
      readSaved,
      save: async () => {},
      send,
      revoke: () => {},
      generation: () => 0,
      lock: null,
      waitForOtherTab: async () => {},
      now: () => Date.UTC(2026, 9, 9, 4, 0, 0),
    },
  };
}

test('the server refuses the refresh: the login ends and its 401 is passed on', async () => {
  const refused = httpError(401, { code: 'token_not_valid', message: 'Your sign-in has expired. Please sign in again.' });
  const { env } = device({
    send: async () => {
      throw refused;
    },
  });
  assert.deepEqual(await refreshTokens(env), { ok: false, expired: 'refresh-1', error: refused });
});

test('no network during the refresh: the login stays and the network error is passed on', async () => {
  const offline = new TypeError('Network request failed');
  const { env, tokens } = device({
    send: async () => {
      throw offline;
    },
  });
  assert.deepEqual(await refreshTokens(env), { ok: false, expired: null, error: offline });
  assert.deepEqual(tokens(), { access: 'access-1', refresh: 'refresh-1' }, 'the tokens are kept');
});

test('a server error during the refresh (502) keeps the login and is passed on', async () => {
  const down = httpError(502, '<html>Bad Gateway</html>');
  const { env } = device({
    send: async () => {
      throw down;
    },
  });
  assert.deepEqual(await refreshTokens(env), { ok: false, expired: null, error: down });
});

test("the second try with another tab's newer token fails on the network: the login stays", async () => {
  let saved = { userId: 'user-1', access: null, refresh: 'refresh-1' };
  const offline = new TypeError('Failed to fetch');
  const sent = [];
  const { env } = device({
    readSaved: () => saved,
    send: async (token) => {
      sent.push(token);
      if (token !== 'refresh-1') throw offline;
      saved = { userId: 'user-1', access: null, refresh: 'refresh-2' }; // the other tab was faster
      throw httpError(401, { code: 'token_not_valid' });
    },
  });
  assert.deepEqual(await refreshTokens(env), { ok: false, expired: null, error: offline });
  assert.deepEqual(sent, ['refresh-1', 'refresh-2']);
});

test('the second try is refused too: that token is the expired one and its 401 is passed on', async () => {
  let saved = { userId: 'user-1', access: null, refresh: 'refresh-1' };
  const second = httpError(401, { code: 'password_changed' });
  const { env } = device({
    readSaved: () => saved,
    send: async (token) => {
      if (token !== 'refresh-1') throw second;
      saved = { userId: 'user-1', access: null, refresh: 'refresh-2' };
      throw httpError(401, { code: 'token_not_valid' });
    },
  });
  assert.deepEqual(await refreshTokens(env), { ok: false, expired: 'refresh-2', error: second });
});

test('a successful refresh has no error', async () => {
  const { env, tokens } = device({ send: async () => ({ access: 'access-2', refresh: 'refresh-2' }) });
  assert.deepEqual(await refreshTokens(env), { ok: true });
  assert.deepEqual(tokens(), { access: 'access-2', refresh: 'refresh-2' });
});

test('signOutReason: only a 401 whose code says why (password changed, account disabled or removed)', () => {
  const changed = { status: 401, code: 'password_changed', message: 'Your password was changed. Please sign in again.' };
  const disabled = { status: 401, code: 'user_inactive', message: 'This account has been disabled. Contact the department office.' };
  const removed = { status: 401, code: 'user_not_found', message: 'This account no longer exists.' };
  assert.equal(signOutReason(changed), changed);
  assert.equal(signOutReason(disabled), disabled);
  assert.equal(signOutReason(removed), removed);
  assert.equal(signOutReason({ status: 401, code: 'token_not_valid' }), null, 'a plain expiry: the usual words');
  assert.equal(signOutReason({ status: 401, code: null }), null);
  assert.equal(signOutReason({ status: 403, code: 'user_inactive' }), null, 'only a 401 ends a login');
  assert.equal(signOutReason({ status: 0, code: 'network_error' }), null);
  assert.equal(signOutReason(), null);
  assert.equal(signOutReason(null, undefined), null);
});

test('signOutReason: the first error that says why wins (the refused refresh, then the 401 before it)', () => {
  const changed = { status: 401, code: 'password_changed' };
  const disabled = { status: 401, code: 'user_inactive' };
  const blacklisted = { status: 401, code: 'token_not_valid' };
  assert.equal(signOutReason(blacklisted, disabled), disabled, 'the refresh only says "blacklisted"');
  assert.equal(signOutReason(changed, disabled), changed);
  assert.equal(signOutReason(null, changed), changed);
});
