// Student screens: which semester is current, the summary tile, past-tense wording, absent
// reasons and live classes ending (components/student/logic.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  absentReasonText,
  belowMinSummary,
  currentSemester,
  isCurrentSemester,
  liveEnded,
  noClassesText,
  orderSemesters,
} from '../components/student/logic.ts';

// The API sorts semesters by level then term (oldest first).
const L2T1 = { id: 'L2T1', level: 'Second', semester: 'I', is_active: true, left_at: null };
const L2T2 = { id: 'L2T2', level: 'Second', semester: 'II', is_active: false, left_at: null };
const L3T1 = { id: 'L3T1', level: 'Third', semester: 'I', is_active: true, left_at: null };
const L4T1 = { id: 'L4T1', level: 'Fourth', semester: 'I', is_active: true, left_at: '2026-10-01' };

test('a current semester is active and not left', () => {
  assert.equal(isCurrentSemester(L2T1), true);
  assert.equal(isCurrentSemester(L2T2), false); // finished
  assert.equal(isCurrentSemester(L4T1), false); // left
});

test('two current semesters: Home shows the one matching the profile, else the highest level', () => {
  const list = [L2T1, L2T2, L3T1, L4T1];
  assert.equal(currentSemester(list, { level: 'Third', term: 'I' }).id, 'L3T1');
  assert.equal(currentSemester(list, { level: 'Second', term: 'I' }).id, 'L2T1');
  // No profile, or a profile matching neither (e.g. not updated yet): the highest level.
  assert.equal(currentSemester(list).id, 'L3T1');
  assert.equal(currentSemester(list, { level: 'Second', term: 'II' }).id, 'L3T1');
  assert.equal(currentSemester([L2T2, L4T1], { level: 'Second', term: 'II' }), undefined);
});

test('courses page: the Home semester first, any other current one, then the rest newest first', () => {
  const list = [L2T1, L2T2, L3T1, L4T1];
  assert.deepEqual(orderSemesters(list, { level: 'Second', term: 'I' }).map((s) => s.id), ['L2T1', 'L3T1', 'L4T1', 'L2T2']);
  assert.deepEqual(orderSemesters(list).map((s) => s.id), ['L3T1', 'L2T1', 'L4T1', 'L2T2']);
  assert.deepEqual(orderSemesters([L2T2, L4T1]).map((s) => s.id), ['L4T1', 'L2T2']);
});

test('no classes: "yet" while classes can come, "held" once the semester is over or left', () => {
  assert.equal(noClassesText(), 'No classes yet');
  assert.equal(noClassesText('open'), 'No classes yet');
  assert.equal(noClassesText('finished'), 'No classes held');
  assert.equal(noClassesText('left'), 'No classes held');
});

test('the "Courses below" tile agrees with the course rows', () => {
  const ok = { held: 10, below_min: false, classes_needed: 0 };
  const low = { held: 10, below_min: true, classes_needed: 4 };
  const lost = { held: 5, below_min: true, classes_needed: null }; // e.g. a 100% minimum
  const none = { held: 0, below_min: false, classes_needed: 0 };
  assert.deepEqual(belowMinSummary([], 75), { value: '—', hint: 'No courses yet', low: 0 });
  assert.deepEqual(belowMinSummary([none, none], 75), { value: '—', hint: 'No classes yet', low: 0 });
  assert.deepEqual(belowMinSummary([ok, none], 75), { value: 'None', hint: 'All at or above 75%', low: 0 });
  assert.deepEqual(belowMinSummary([ok, low], 75), { value: '1', hint: 'Attend the next classes to catch up', low: 1 });
  assert.deepEqual(belowMinSummary([ok, lost], 100), {
    value: '1',
    hint: "100% can't be reached any more. Talk to your teacher.",
    low: 1,
  });
  assert.equal(belowMinSummary([lost, lost], 100).hint, "100% can't be reached any more. Talk to your teachers.");
  // A course without classes is never counted as below the minimum.
  assert.equal(belowMinSummary([ok, { held: 0, below_min: true, classes_needed: null }], 75).low, 0);
});

test('absent days say why', () => {
  assert.equal(absentReasonText('changed'), 'Marked absent by teacher');
  assert.equal(absentReasonText('roll_call'), 'Marked absent in roll call');
  assert.equal(absentReasonText('class_photo'), 'Not found in the class photo');
  assert.equal(absentReasonText('not_checked_in'), 'Not checked in');
  assert.equal(absentReasonText(null), '');
  assert.equal(absentReasonText(undefined), '');
  assert.equal(absentReasonText('toString'), '');
});

test('a live class ended when its session leaves the list', () => {
  assert.equal(liveEnded(null, []), false); // the first answer
  assert.equal(liveEnded(['a'], ['a']), false);
  assert.equal(liveEnded(['a'], ['a', 'b']), false); // a new class started
  assert.equal(liveEnded(['a'], []), true);
  assert.equal(liveEnded(['a', 'b'], ['b']), true);
  assert.equal(liveEnded([], []), false);
});
