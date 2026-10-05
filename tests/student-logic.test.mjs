// Student screens' pure helpers (components/student/logic.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  catchUpText,
  cleanCode,
  currentSemester,
  describeCheckInError,
  methodLabel,
  orderSemesters,
  outsideReason,
  queryParams,
  readCheckInLink,
} from '../components/student/logic.ts';

const SESSION = '3f2b6c1e-8a4d-4f7b-9c2e-1d5a6b7c8d9e';

test('cleanCode keeps up to 6 digits from typed or pasted text', () => {
  assert.equal(cleanCode('482913'), '482913');
  assert.equal(cleanCode('482 913'), '482913');
  assert.equal(cleanCode(' 482-913 '), '482913');
  assert.equal(cleanCode('48291345'), '482913');
  assert.equal(cleanCode('abc12'), '12');
  assert.equal(cleanCode('৪৮২৯১৩'), '482913'); // Bengali digits
  assert.equal(cleanCode(''), '');
  assert.equal(cleanCode(null), '');
});

test('readCheckInLink takes the session and code from the teacher QR', () => {
  assert.deepEqual(readCheckInLink(`https://attendanceportal.sakibkx.tech/check-in?s=${SESSION}&c=048213`), {
    kind: 'check-in',
    sessionId: SESSION,
    code: '048213',
  });
  // Another host (local copy), a trailing slash, other parameters and a hash still work.
  assert.deepEqual(readCheckInLink(`http://127.0.0.1:8202/check-in/?x=1&c=482913&s=${SESSION}#top`), {
    kind: 'check-in',
    sessionId: SESSION,
    code: '482913',
  });
  assert.deepEqual(readCheckInLink(`/check-in?s=${SESSION}&c=482%20913`), {
    kind: 'check-in',
    sessionId: SESSION,
    code: '482913',
  });
});

test('readCheckInLink rejects other and broken QR codes', () => {
  assert.deepEqual(readCheckInLink('https://example.com/'), { kind: 'other' });
  assert.deepEqual(readCheckInLink(`https://x.test/check-in?s=${SESSION}`), { kind: 'other' });
  assert.deepEqual(readCheckInLink(`https://x.test/check-in?s=${SESSION}&c=12345`), { kind: 'other' });
  assert.deepEqual(readCheckInLink('https://x.test/check-in?s=not-a-uuid&c=123456'), { kind: 'other' });
  assert.deepEqual(readCheckInLink(`https://x.test/checkin?s=${SESSION}&c=123456`), { kind: 'other' });
  assert.deepEqual(readCheckInLink('just some text'), { kind: 'other' });
  assert.deepEqual(readCheckInLink(''), { kind: 'other' });
  assert.deepEqual(readCheckInLink(`https://x.test/attendance/submit?sessionId=${SESSION}&qrToken=abc`), { kind: 'old' });
});

test('queryParams decodes values and keeps the first of repeated keys', () => {
  assert.deepEqual(queryParams('/a?x=1&y=a%20b&x=2&z'), { x: '1', y: 'a b', z: '' });
  assert.deepEqual(queryParams('/a'), {});
  assert.deepEqual(queryParams('/a?bad=%E0%A4'), { bad: '%E0%A4' });
});

test('methodLabel names how a day was marked', () => {
  assert.equal(methodLabel('QR'), 'QR scan');
  assert.equal(methodLabel('CODE'), 'Code');
  assert.equal(methodLabel('FACE'), 'Face');
  assert.equal(methodLabel('TEACHER'), 'Marked by teacher');
  assert.equal(methodLabel(null), '');
});

test('catchUpText says how many classes to attend', () => {
  assert.equal(catchUpText(3, 75), 'Attend the next 3 classes to reach 75%.');
  assert.equal(catchUpText(1, 75), 'Attend the next 1 class to reach 75%.');
  assert.equal(catchUpText(0, 75), '');
  assert.match(catchUpText(null, 100), /can't reach 100%/);
});

test('semesters: the current one first, then newest first', () => {
  const list = [
    { id: 'L1T1', is_active: false, left_at: '2025-01-01' },
    { id: 'L1T2', is_active: false, left_at: '2025-07-01' },
    { id: 'L2T1', is_active: true, left_at: null },
    { id: 'L2T2', is_active: true, left_at: '2026-01-01' }, // left mid-semester
  ];
  assert.equal(currentSemester(list).id, 'L2T1');
  assert.deepEqual(orderSemesters(list).map((s) => s.id), ['L2T1', 'L2T2', 'L1T2', 'L1T1']);
  assert.deepEqual(orderSemesters(list.slice(0, 2)).map((s) => s.id), ['L1T2', 'L1T1']);
  assert.equal(currentSemester([]), undefined);
});

test('outsideReason tells days before joining from days after leaving', () => {
  // Newest first.
  const days = [
    { date: '2026-10-04', status: null },
    { date: '2026-10-01', status: 'PRESENT' },
    { date: '2026-09-27', status: 'ABSENT' },
    { date: '2026-09-20', status: null },
  ];
  assert.equal(outsideReason(days, 0), 'After you left');
  assert.equal(outsideReason(days, 3), 'Before you joined');
  assert.equal(outsideReason([{ date: '2026-10-01', status: null }], 0), 'Not on the class list');
});

test('describeCheckInError gives a readable reason for every check-in error', () => {
  const linkExpired = describeCheckInError({ code: 'code_invalid', status: 400 }, 'link');
  assert.equal(linkExpired.title, 'This QR code has expired');
  assert.equal(describeCheckInError({ code: 'code_invalid', status: 400 }, 'code').title, "That code didn't work");
  assert.equal(describeCheckInError({ code: 'not_enrolled', status: 403 }, 'code').title, "You're not on this class list");
  const already = describeCheckInError({ code: 'already_checked_in', status: 409 }, 'link');
  assert.equal(already.tone, 'info');
  assert.equal(describeCheckInError({ code: 'device_used', status: 409 }, 'code').title, 'This phone was already used');
  assert.equal(describeCheckInError({ code: 'session_ended', status: 410 }, 'link').title, 'Attendance has closed');
  const offline = describeCheckInError({ code: 'network_error', status: 0, message: "Can't reach the server." }, 'code');
  assert.equal(offline.title, 'No connection');
  assert.equal(offline.retry, true);
  const busy = describeCheckInError({ code: 'busy', status: 503, message: 'Busy. Try again.' }, 'code');
  assert.equal(busy.message, 'Busy. Try again.');
  assert.equal(busy.retry, true);
});
