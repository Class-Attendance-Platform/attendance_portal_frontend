// Class photo page rules (components/teacher/face-review.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  correctedMarks,
  extraPhotosText,
  facesShown,
  MAX_PHOTO_BYTES,
  noFacesText,
  photoProblem,
  photoProblemText,
  presentIds,
  skippedText,
  teacherMarkedIds,
  withCorrections,
} from '../components/teacher/face-review.ts';

const photo = { type: 'image', mimeType: 'image/jpeg', width: 4000, height: 3000, fileSize: 3_000_000 };

test('a normal photo can be added on the web and on phones', () => {
  assert.equal(photoProblem(photo, true), null);
  assert.equal(photoProblem(photo, false), null);
  assert.equal(photoProblem({ ...photo, mimeType: 'image/PNG' }, true), null);
});

test('videos and other files are not photos', () => {
  const video = { ...photo, type: 'video', mimeType: 'video/mp4' };
  assert.equal(photoProblem(video, true), 'not_photo');
  assert.equal(photoProblem(video, false), 'not_photo');
  assert.equal(photoProblem({ ...photo, type: null, mimeType: 'application/pdf' }, false), 'not_photo');
});

test('on the web, a file the browser cannot show as a picture is refused', () => {
  // e.g. a text file renamed to .jpg: the browser reports a width of 0
  assert.equal(photoProblem({ ...photo, width: 0, height: 0 }, true), 'not_photo');
  // phones may report no width for a real photo: the server checks those
  assert.equal(photoProblem({ ...photo, width: 0, height: 0 }, false), null);
  // the type is unknown on some phones: let the server decide
  assert.equal(photoProblem({ width: 0, height: 0 }, false), null);
});

test('on the web, photos over 10 MB are refused before the upload', () => {
  assert.equal(photoProblem({ ...photo, fileSize: MAX_PHOTO_BYTES }, true), null);
  assert.equal(photoProblem({ ...photo, fileSize: MAX_PHOTO_BYTES + 1 }, true), 'too_big');
  assert.equal(photoProblem({ ...photo, fileSize: undefined }, true), null);
  // phones upload a smaller copy, so the original's size says nothing
  assert.equal(photoProblem({ ...photo, fileSize: MAX_PHOTO_BYTES + 1 }, false), null);
});

test('photos over 50 megapixels are refused everywhere', () => {
  assert.equal(photoProblem({ ...photo, width: 10000, height: 5000 }, true), null);
  assert.equal(photoProblem({ ...photo, width: 9000, height: 6000 }, true), 'too_many_pixels');
  assert.equal(photoProblem({ ...photo, width: 9000, height: 6000 }, false), 'too_many_pixels');
});

test('one refused file gets a plain reason', () => {
  assert.equal(photoProblemText([], 1), null);
  assert.equal(photoProblemText(['not_photo'], 1), 'That file is not a photo. Choose a JPG or PNG image.');
  assert.equal(photoProblemText(['too_big'], 1), 'That photo is larger than 10 MB. Choose a smaller photo.');
  assert.equal(photoProblemText(['too_many_pixels'], 1), 'That photo is too large. Use a normal camera photo.');
});

test('several picked files say how many were left out', () => {
  assert.equal(photoProblemText(['too_big'], 3), '1 of the 3 files was not added. A photo can be 10 MB at most.');
  assert.equal(photoProblemText(['not_photo', 'not_photo'], 2), '2 of the 2 files were not added. Only JPG or PNG photos can be used.');
  assert.equal(
    photoProblemText(['not_photo', 'too_big'], 3),
    '2 of the 3 files were not added. Use JPG or PNG photos of 10 MB at most.'
  );
});

test('the photo limit message reads well for one or more', () => {
  assert.equal(extraPhotosText(1, 3), 'Only 3 photos can be used, so only the first one was added.');
  assert.equal(extraPhotosText(2, 3), 'Only 3 photos can be used, so only the first 2 were added.');
});

test('no faces: advice for one photo or several', () => {
  assert.equal(noFacesText(1), 'No faces were found in the photo. Take a closer, well-lit photo, or use roll call.');
  assert.equal(noFacesText(2), 'No faces were found in the photos. Take a closer, well-lit photo, or use roll call.');
});

const log = (profile_id, status, changed = false) => ({
  profile_id,
  status,
  changed_by: changed ? 'Demo Teacher' : null,
  changed_at: changed ? '2026-10-09T12:17:31+06:00' : null,
});

test("today's corrections are the logs a teacher changed", () => {
  assert.deepEqual(correctedMarks([]), {});
  assert.deepEqual(
    correctedMarks([log('a', 'PRESENT', true), log('b', 'ABSENT', true), log('c', 'PRESENT'), log('d', 'ABSENT')]),
    { a: true, b: false }
  );
  // a teacher account removed since: the time still says it was changed
  assert.deepEqual(correctedMarks([{ ...log('e', 'PRESENT', true), changed_by: null }]), { e: true });
});

test("a teacher's own marks today count too (method TEACHER), but not check-ins or photo results", () => {
  assert.deepEqual(
    correctedMarks([
      // switched to Present in an earlier class photo review, or Mark present in a live session
      { ...log('hand', 'PRESENT'), method: 'TEACHER' },
      // marked absent in a roll call
      { ...log('roll', 'ABSENT'), method: 'TEACHER' },
      { ...log('qr', 'PRESENT'), method: 'QR' },
      { ...log('photo', 'PRESENT'), method: 'FACE' },
      { ...log('missed', 'ABSENT'), method: null },
    ]),
    { hand: true, roll: false }
  );
});

const students = [
  { id: 'match', status: 'present', reason: 'match' },
  { id: 'weak', status: 'unsure', reason: 'low_match' },
  { id: 'noface', status: 'unsure', reason: 'no_face' },
  { id: 'missing', status: 'absent', reason: 'not_found' },
];

test('the review starts from the photos: matches and weak matches present', () => {
  assert.deepEqual(withCorrections(students, {}), { match: true, weak: true, noface: false, missing: false });
});

test("the review starts with today's corrections applied, in both directions", () => {
  const marks = withCorrections(students, { noface: true, match: false, gone: true });
  assert.deepEqual(marks, { match: false, weak: true, noface: true, missing: false });
});

test("corrections loaded later keep the teacher's own switches", () => {
  // the teacher already switched 'missing' to present and 'weak' to absent
  const current = { match: true, weak: false, noface: false, missing: true };
  const marks = withCorrections(students, { missing: false, weak: true, noface: true }, current);
  assert.deepEqual(marks, { match: true, weak: false, noface: true, missing: true });
});

test('an earlier hand mark starts the next review as Present and is saved as marked by the teacher again', () => {
  // 'noface' was switched to Present in this morning's review; the new photos still can't find them
  const earlier = correctedMarks([{ ...log('noface', 'PRESENT'), method: 'TEACHER' }]);
  const marks = withCorrections(students, earlier);
  assert.equal(marks.noface, true);
  assert.deepEqual(presentIds(students, marks), ['match', 'weak', 'noface']);
  assert.deepEqual(teacherMarkedIds(students, marks), ['noface']);
  // the teacher can still turn them absent
  assert.deepEqual(teacherMarkedIds(students, { ...marks, noface: false }), []);
});

test('present students the photos did not find are marked by the teacher', () => {
  const marks = { match: true, weak: true, noface: true, missing: true };
  assert.deepEqual(presentIds(students, marks), ['match', 'weak', 'noface', 'missing']);
  assert.deepEqual(teacherMarkedIds(students, marks), ['noface', 'missing']);
  assert.deepEqual(teacherMarkedIds(students, { match: true, weak: true, noface: false, missing: false }), []);
});

test('faces shown count each boxed face once', () => {
  const box = { photo: 0, box: [0, 0, 10, 10] };
  const result = {
    students: [{ face: box }, { face: { ...box, photo: 1 } }, { face: null }],
    unknown_faces: [{ ...box, crop: 'x' }],
  };
  assert.equal(facesShown(result), 3);
  assert.equal(facesShown({ students: [{ face: null }], unknown_faces: [] }), 0);
});

test('skipped students are named after saving', () => {
  assert.equal(skippedText([]), null);
  assert.equal(
    skippedText([{ profile_id: 'a', name: 'Tanvir Hasan' }]),
    "Tanvir Hasan was not saved: no longer on this course's class list."
  );
  assert.equal(
    skippedText([
      { profile_id: 'a', name: 'Tanvir Hasan' },
      { profile_id: 'b', name: 'Sadia Islam' },
    ]),
    "2 students were not saved because they are no longer on this course's class list: Tanvir Hasan, Sadia Islam."
  );
});
