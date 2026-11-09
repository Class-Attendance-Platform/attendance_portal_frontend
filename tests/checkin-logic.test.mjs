// Check-in helpers (components/student/logic.ts): the code field, error texts and the "Live now"
// recheck after a failed check-in. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeCheckInError, describeWithLiveList, needsLiveList, readCodeField } from '../components/student/logic.ts';

const X = '3f2b6c1e-8a4d-4f7b-9c2e-1d5a6b7c8d9e';
const X2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const Y = '11111111-2222-4333-8444-555555555555';
const open = (session_id) => ({ session_id, checked_in: false });
const done = (session_id) => ({ session_id, checked_in: true });

test('readCodeField keeps digits typed or pasted', () => {
  assert.deepEqual(readCodeField('48291'), { kind: 'code', code: '48291' });
  assert.deepEqual(readCodeField(' 482-913 '), { kind: 'code', code: '482913' });
  assert.deepEqual(readCodeField('৪৮২৯১৩'), { kind: 'code', code: '482913' });
  // Shared in a chat: words and a colon are not a link.
  assert.deepEqual(readCodeField('Code: 482 913'), { kind: 'code', code: '482913' });
  assert.deepEqual(readCodeField('482/913'), { kind: 'code', code: '482913' });
  assert.deepEqual(readCodeField(''), { kind: 'code', code: '' });
  assert.deepEqual(readCodeField(null), { kind: 'code', code: '' });
});

test('readCodeField checks in with a pasted check-in link', () => {
  assert.deepEqual(readCodeField(`https://attendanceportal.sakibkx.tech/check-in?s=${X}&c=048213`), {
    kind: 'check-in',
    sessionId: X,
    code: '048213',
  });
  // Pasted after digits already in the field.
  assert.deepEqual(readCodeField(`48http://127.0.0.1:8200/check-in?s=${X}&c=482913`), {
    kind: 'check-in',
    sessionId: X,
    code: '482913',
  });
});

test('readCodeField never takes digits from other links', () => {
  const old = readCodeField(`https://attendanceportal.sakibkx.tech/attendance/submit?sessionId=${X}&qrToken=abc123`);
  assert.equal(old.kind, 'note');
  assert.match(old.note, /old app/);
  // A check-in link without its code, or with a short one.
  for (const link of [`http://127.0.0.1:8200/check-in?s=${X}`, `https://attendanceportal.sakibkx.tech/check-in?s=${X}&c=12`]) {
    const broken = readCodeField(link);
    assert.equal(broken.kind, 'note', link);
    assert.match(broken.note, /incomplete/, link);
  }
  for (const link of ['https://example.com/watch?v=2026', 'www.example.com', 'example.com/a1b2c3d4e5']) {
    const other = readCodeField(link);
    assert.equal(other.kind, 'note', link);
    assert.match(other.note, /isn't a check-in link/, link);
  }
});

test('describeCheckInError: throttled QR links are not sent again', () => {
  const server = 'Too many attempts. Please try again in 56 seconds.';
  const link = describeCheckInError({ code: 'throttled', status: 429, message: server }, 'link');
  assert.equal(link.retry, false); // the link's code has expired by then
  assert.equal(link.message, `${server} Then scan the QR again, or type the newest code.`);
  assert.equal(describeCheckInError({ code: 'throttled', status: 429, message: 'Wait a bit' }, 'link').message.startsWith('Wait a bit. Then'), true);
  assert.match(describeCheckInError({ code: 'throttled', status: 429 }, 'link').message, /scan the QR again/);
  // A typed code: the student types the newest code after the wait.
  const typed = describeCheckInError({ code: 'throttled', status: 429, message: server }, 'code');
  assert.equal(typed.retry, true);
  assert.equal(typed.message, server);
});

test('describeCheckInError: a timeout is not "No connection"', () => {
  const message = 'The server took too long to answer. Please try again.';
  for (const via of ['link', 'code']) {
    const slow = describeCheckInError({ code: 'timeout', status: 0, message }, via);
    assert.equal(slow.title, 'The server is slow');
    assert.equal(slow.message, message);
    assert.equal(slow.retry, true);
  }
  assert.equal(describeCheckInError({ code: 'network_error', status: 0 }, 'code').title, 'No connection');
});

test('describeCheckInError: a typed wrong code may be for another class', () => {
  assert.match(describeCheckInError({ code: 'code_invalid', status: 400 }, 'code').message, /not for one of your classes/);
});

test('needsLiveList: typed wrong codes and closed QR links', () => {
  assert.equal(needsLiveList({ code: 'code_invalid' }, 'code'), true);
  assert.equal(needsLiveList({ code: 'session_ended' }, 'link'), true);
  assert.equal(needsLiveList({ code: 'code_invalid' }, 'link'), false);
  assert.equal(needsLiveList({ code: 'device_used' }, 'code'), false);
  assert.equal(needsLiveList({ code: null }, 'code'), false);
});

const WRONG = { code: 'code_invalid', status: 400 };

test('a typed wrong code while a class is open: the form stays', () => {
  // Restarted (cancelled X, started X2), the next class (Y), or ?s= of the cancelled one.
  for (const [context, name] of [
    [{ listed: [open(X)], fresh: [open(X2)] }, 'restarted'],
    [{ listed: [open(X)], fresh: [open(Y)] }, 'next class'],
    [{ sessionId: X, listed: [open(X2)], fresh: [open(X2)] }, 'banner of the cancelled session'],
    [{ sessionId: X, listed: null, fresh: [open(X)] }, 'list not loaded yet'],
  ]) {
    const problem = describeWithLiveList(WRONG, 'code', context);
    assert.equal(problem.title, "That code didn't work", name);
    assert.ok(!problem.final, name);
  }
});

test('a typed code after the class closed: attendance has closed', () => {
  const closed = describeWithLiveList(WRONG, 'code', { listed: [open(X)], fresh: [] });
  assert.equal(closed.title, 'Attendance has closed');
  assert.equal(closed.final, true);
  // Checked in to another class that is still live; the banner's class closed.
  assert.equal(describeWithLiveList(WRONG, 'code', { listed: [open(X), done(Y)], fresh: [done(Y)] }).final, true);
  assert.equal(describeWithLiveList(WRONG, 'code', { sessionId: X, listed: null, fresh: [] }).final, true);
});

test('a typed code while no class of theirs is live: not on the class list?', () => {
  for (const listed of [[], null]) {
    const none = describeWithLiveList(WRONG, 'code', { listed, fresh: [] });
    assert.equal(none.tone, 'warn');
    assert.ok(!none.final);
    assert.match(none.message, /None of your classes is taking attendance right now/);
    assert.match(none.message, /class list/);
  }
});

test('a typed wrong code: no false "closed"', () => {
  // ?s= of a class already checked in (still live): just a wrong code.
  assert.equal(describeWithLiveList(WRONG, 'code', { sessionId: X, listed: [done(X)], fresh: [done(X)] }).title, "That code didn't work");
  // ?s= of a class shown checked in that has closed since: not "closed" either.
  assert.ok(!describeWithLiveList(WRONG, 'code', { sessionId: X, listed: [done(X), done(Y)], fresh: [done(Y)] }).final);
  // The list could not be loaded: the plain answer.
  assert.equal(describeWithLiveList(WRONG, 'code', { sessionId: X, listed: [open(X)], fresh: null }).title, "That code didn't work");
  // Other errors are left as they are.
  assert.deepEqual(
    describeWithLiveList({ code: 'device_used', status: 409 }, 'code', { listed: [open(X)], fresh: [] }),
    describeCheckInError({ code: 'device_used', status: 409 }, 'code')
  );
});

test('a closed QR while another class of theirs is open: scan or type the newest code', () => {
  const ENDED = { code: 'session_ended', status: 410 };
  const again = describeWithLiveList(ENDED, 'link', { sessionId: X, fresh: [open(X2)] });
  assert.equal(again.title, 'This QR code has closed');
  assert.ok(!again.final);
  assert.equal(again.retry, false);
  // Nothing else open: the final card stays.
  for (const fresh of [[], [done(Y)], [open(X)], null]) {
    const closed = describeWithLiveList(ENDED, 'link', { sessionId: X, fresh });
    assert.equal(closed.title, 'Attendance has closed', JSON.stringify(fresh));
    assert.equal(closed.final, true);
  }
  // An expired QR code is not rechecked.
  assert.equal(describeWithLiveList(WRONG, 'link', { sessionId: X, fresh: [open(Y)] }).title, 'This QR code has expired');
});
