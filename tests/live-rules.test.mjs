// Live session rules (components/teacher/live-rules.ts). Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { codeValidUntil, isSmallWindow, projectorLayout, QR_MIN } from '../components/teacher/live-rules.ts';

test('a code is accepted until the end of the window after its own, less a second', () => {
  assert.equal(codeValidUntil(1000, 30, 30), 60000);
  assert.equal(codeValidUntil(0, 1, 30), 30000);
  assert.equal(codeValidUntil(0, 99, 30), 59000); // never more than one window ahead
});

test('odd answers fall back to the shortest time', () => {
  assert.equal(codeValidUntil(0, Number.NaN, 30), 29000);
  assert.equal(codeValidUntil(0, -5, 30), 29000);
  assert.equal(codeValidUntil(0, 10, 0), 39000); // no period: 30 s
});

test('the code is never shown as valid after the server stops taking it', () => {
  // The server (apps/attendance/codes.py): window = floor(t / 30), expires_in = ceil(end of window - t)
  // kept within 1..30, and a code works while the window is its own or the next one.
  for (let tenths = 0; tenths < 1200; tenths += 7) {
    const serverTime = 1_000_000 + tenths / 10;
    const window = Math.floor(serverTime / 30);
    const expiresIn = Math.max(1, Math.min(30, Math.ceil((window + 1) * 30 - serverTime)));
    const lastAccepted = (window + 2) * 30 * 1000; // exclusive
    for (const askedEarlierMs of [0, 400, 3000]) {
      const until = codeValidUntil(serverTime * 1000 - askedEarlierMs, expiresIn, 30);
      assert.ok(until < lastAccepted, `t=${serverTime} asked ${askedEarlierMs} ms earlier`);
      assert.ok(until >= lastAccepted - 1000 - askedEarlierMs, `t=${serverTime}: not much too early`);
    }
  }
});

// The page around the scrolling area: 20 px on each side, 12 + 16 px above and below, and the
// header (one row on wide windows, about three rows on phones).
function page(width, height, header, info = 0) {
  const space = { width, height, areaWidth: width - 40, areaHeight: height - 28 - header, infoHeight: info };
  return { space, layout: projectorLayout(space) };
}

/** Everything fits in the scrolling area (16 px above and below), so nothing needs scrolling. */
function fits({ space, layout }) {
  const room = space.areaHeight - 32;
  const card = layout.qrSize + 34;
  if (layout.wide) return card <= room && card + 48 + layout.infoWidth <= space.areaWidth;
  return card + 24 + space.infoHeight <= room && card <= space.areaWidth;
}

test('portrait phones: QR, code and count all fit under the header', () => {
  for (const [width, height] of [
    [360, 640],
    [360, 720],
    [393, 700],
    [412, 915],
  ]) {
    const result = page(width, height, 150, 192);
    assert.equal(result.layout.wide, false, `${width}x${height}`);
    assert.equal(result.layout.small, true);
    assert.equal(result.layout.codeSize, 52);
    assert.ok(result.layout.qrSize >= QR_MIN);
    assert.ok(fits(result), `${width}x${height}: ${JSON.stringify(result.layout)}`);
  }
  assert.equal(page(360, 640, 150, 192).layout.qrSize, 180);
});

test('portrait tablets keep the stacked layout with large words', () => {
  const result = page(768, 1024, 58, 252);
  assert.equal(result.layout.wide, false);
  assert.equal(result.layout.small, false);
  assert.equal(result.layout.codeSize, 84);
  assert.ok(fits(result));
});

test('projectors, laptops and phones held sideways: QR beside the words, all inside', () => {
  for (const [width, height] of [
    [740, 360],
    [800, 360],
    [844, 390],
    [915, 412],
    [800, 600],
    [1024, 650],
    [1024, 768],
    [1280, 610],
    [1366, 657],
    [1920, 1080],
  ]) {
    const result = page(width, height, 58);
    const { layout } = result;
    assert.equal(layout.wide, true, `${width}x${height}`);
    assert.ok(fits(result), `${width}x${height}: ${JSON.stringify(layout)}`);
    // "482 913" with 8 px letter spacing (4.42 em + 56 px in the browser) fits the words column,
    // with a little room to spare.
    assert.ok(layout.codeSize * 4.42 + 56 <= layout.infoWidth - 8, `${width}x${height}: code ${layout.codeSize}`);
    assert.equal(layout.small, height < 500);
  }
  assert.equal(page(1920, 1080, 58).layout.codeSize, 112);
  assert.equal(page(800, 600, 58).layout.qrSize, 359);
});

test('a window too small for everything keeps the smallest QR and scrolls', () => {
  const result = page(360, 560, 150, 192);
  assert.equal(result.layout.qrSize, QR_MIN);
  assert.equal(fits(result), false);
});

test('small words for narrow or short windows only', () => {
  assert.equal(isSmallWindow(360, 800), true);
  assert.equal(isSmallWindow(844, 390), true);
  assert.equal(isSmallWindow(800, 600), false);
  assert.equal(isSmallWindow(1920, 1080), false);
});
