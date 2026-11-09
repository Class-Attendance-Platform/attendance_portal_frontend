// Words for a camera that cannot be used on the face page (components/student/camera-errors.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NO_CAMERA_TEXT, cameraErrorText } from '../components/student/camera-errors.ts';

// What browsers reject getUserMedia with (a DOMException has a name and a message).
const browserError = (name, message = 'raw browser text') => ({ name, message });

test('no camera on the device says so and points to the phone', () => {
  assert.equal(cameraErrorText(browserError('NotFoundError', 'Requested device not found')), NO_CAMERA_TEXT);
  assert.equal(cameraErrorText(browserError('OverconstrainedError')), NO_CAMERA_TEXT);
  assert.match(NO_CAMERA_TEXT, /No camera was found/);
  assert.match(NO_CAMERA_TEXT, /phone/);
});

test('a camera held by another app asks to close it and try again', () => {
  for (const name of ['NotReadableError', 'AbortError']) {
    const text = cameraErrorText(browserError(name, 'Could not start video source'));
    assert.match(text, /being used by another app/);
    assert.match(text, /Try again/);
  }
});

test('a blocked camera points to the settings', () => {
  assert.match(cameraErrorText(browserError('NotAllowedError', 'Permission denied')), /settings/);
});

test('anything else gets a plain sentence, never the raw message', () => {
  const cases = [
    browserError('TypeError', "Cannot read properties of undefined (reading 'getUserMedia')"),
    { message: 'Camera component could not be rendered - is there any other instance running?' }, // Android
    null,
    undefined,
    'text',
  ];
  for (const error of cases) {
    const text = cameraErrorText(error);
    assert.equal(text, 'The camera could not start. Press Try again.');
  }
});
