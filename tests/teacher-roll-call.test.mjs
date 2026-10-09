// Roll call rules (components/teacher/rules.ts): dates and marks. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  defaultRollCallDate,
  inRange,
  isDateParam,
  keepSwitches,
  rollCallIds,
  rollCallRange,
  startingMarks,
} from '../components/teacher/rules.ts';

const TODAY = '2026-10-09';

test('a ?date= must be exactly YYYY-MM-DD and a real day', () => {
  assert.equal(isDateParam('2026-09-15'), true);
  assert.equal(isDateParam('2026-09-15T10:00'), false);
  assert.equal(isDateParam('2026-09-15x'), false);
  assert.equal(isDateParam(' 2026-09-15'), false);
  assert.equal(isDateParam('2026-02-30'), false);
  assert.equal(isDateParam('2026-13-01'), false);
  assert.equal(isDateParam('2028-02-29'), true);
  assert.equal(isDateParam(''), false);
  assert.equal(isDateParam(undefined), false);
});

test('the range starts at the start date and ends only for a finished semester', () => {
  const running = { is_active: true, start_date: '2026-08-28', end_date: '2026-12-15' };
  assert.deepEqual(rollCallRange(running), { start: '2026-08-28', end: null });
  assert.deepEqual(rollCallRange({ ...running, is_active: false }), { start: '2026-08-28', end: '2026-12-15' });
  // Dates not set (or an older server without them): no limit.
  assert.deepEqual(rollCallRange({ is_active: false, start_date: null, end_date: null }), { start: null, end: null });
  assert.deepEqual(rollCallRange({ is_active: false }), { start: null, end: null });
});

test('inRange keeps both ends', () => {
  const range = { start: '2026-08-28', end: '2026-12-15' };
  assert.equal(inRange('2026-08-27', range), false);
  assert.equal(inRange('2026-08-28', range), true);
  assert.equal(inRange('2026-12-15', range), true);
  assert.equal(inRange('2026-12-16', range), false);
  assert.equal(inRange('2019-01-01', { start: null, end: null }), true);
  assert.equal(inRange('2026-12-16', { start: '2026-08-28', end: null }), true);
});

test('a running semester opens the roll call on today', () => {
  assert.equal(defaultRollCallDate(false, ['2026-10-06'], { start: '2026-08-28', end: null }, TODAY), TODAY);
});

test('a finished semester opens on its newest class inside the range, else on its last day', () => {
  const range = { start: '2026-04-10', end: '2026-08-20' };
  assert.equal(defaultRollCallDate(true, ['2026-08-19', '2026-08-12'], range, TODAY), '2026-08-19');
  // A class after the end date cannot take a roll call any more: the newest one inside is used.
  assert.equal(defaultRollCallDate(true, ['2026-08-25', '2026-08-19'], range, TODAY), '2026-08-19');
  assert.equal(defaultRollCallDate(true, [], range, TODAY), '2026-08-20');
  // Finished early (end date still ahead) or no end date: today.
  assert.equal(defaultRollCallDate(true, [], { start: '2026-08-28', end: '2026-12-15' }, TODAY), TODAY);
  assert.equal(defaultRollCallDate(true, [], { start: null, end: null }, TODAY), TODAY);
});

test('a date without a class starts everyone absent', () => {
  const students = [
    { profile_id: 'a', status: null },
    { profile_id: 'b', status: null },
  ];
  assert.deepEqual(startingMarks(students, false), { a: 'ABSENT', b: 'ABSENT' });
});

test('a date with a class keeps students with no mark unmarked', () => {
  const students = [
    { profile_id: 'a', status: 'PRESENT' },
    { profile_id: 'b', status: 'ABSENT' },
    { profile_id: 'late', status: null },
  ];
  assert.deepEqual(startingMarks(students, true), { a: 'PRESENT', b: 'ABSENT', late: null });
});

test('reloading keeps the teacher\'s switches and shows new statuses for the others', () => {
  const initial = { a: 'ABSENT', b: 'ABSENT', late: null };
  const marks = { a: 'PRESENT', b: 'ABSENT', late: 'PRESENT' };
  const fresh = { a: 'ABSENT', b: 'PRESENT', late: null, added: null };
  assert.deepEqual(keepSwitches(fresh, marks, initial), { a: 'PRESENT', b: 'PRESENT', late: 'PRESENT', added: null });
});

test('reloading a list nobody switched shows it as saved', () => {
  const fresh = { a: 'PRESENT', late: null };
  assert.deepEqual(keepSwitches(fresh, { a: 'ABSENT', late: null }, { a: 'ABSENT', late: null }), fresh);
  assert.deepEqual(keepSwitches(fresh, {}, {}), fresh);
});

test('unmarked students are sent in neither list', () => {
  const students = [{ profile_id: 'a' }, { profile_id: 'b' }, { profile_id: 'late' }, { profile_id: 'new' }];
  const marks = { a: 'PRESENT', b: 'ABSENT', late: null };
  assert.deepEqual(rollCallIds(students, marks), { present_profile_ids: ['a'], absent_profile_ids: ['b'] });
});

test('on a date without a class every student is sent', () => {
  const students = [{ profile_id: 'a' }, { profile_id: 'b' }];
  const marks = startingMarks([{ profile_id: 'a', status: null }, { profile_id: 'b', status: null }], false);
  marks.a = 'PRESENT';
  assert.deepEqual(rollCallIds(students, marks), { present_profile_ids: ['a'], absent_profile_ids: ['b'] });
});
