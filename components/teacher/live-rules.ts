// Rules of the live session screens. No imports, so tests/live-rules.test.mjs can run them in Node.

/**
 * Until when (local clock, ms) the server still accepts a code that was asked for at `askedAt`.
 * The server takes the code of the current 30 s window and of the one before, so a code works
 * until the end of the window after its own. `expiresIn` (seconds until the code changes) is
 * rounded up and the answer may come late, so this counts from the moment the code was asked for,
 * less one second: never later than the real end.
 */
export function codeValidUntil(askedAt: number, expiresIn: number, period: number): number {
  const window = Number.isFinite(period) && period > 0 ? period : 30;
  const left = Number.isFinite(expiresIn) ? Math.min(window, Math.max(0, expiresIn)) : 0;
  return askedAt + (left + window - 1) * 1000;
}

/** Smallest QR on the projector page; a window too small for it scrolls instead. */
export const QR_MIN = 140;
/** The white card around the QR: 16 px padding and a 1 px border on each side. */
const QR_CARD = 34;
/** Space above and below the QR and the words inside the scrolling area. */
const AREA_PADDING = 16;
/** Between the QR and the words: gap-12 side by side, gap-6 stacked. */
const GAP_WIDE = 48;
const GAP_STACKED = 24;

export type ProjectorSpace = {
  /** The window (useWindowDimensions). */
  width: number;
  height: number;
  /** The scrolling area under the header (measured, or a guess until then). */
  areaWidth: number;
  areaHeight: number;
  /** Height of the words under the QR in the stacked layout (measured, or a guess until then). */
  infoHeight: number;
};

export type ProjectorLayout = {
  /** QR and words side by side (landscape windows); otherwise the words go under the QR. */
  wide: boolean;
  /** Smaller words and countdown: a narrow window (phone) or a short one (phone held sideways). */
  small: boolean;
  qrSize: number;
  /** Font size of the 6-digit code. */
  codeSize: number;
  /** Width of the words column (side by side), or of the count and its bar (stacked). */
  infoWidth: number;
};

/** True for windows that get the smaller words (see ProjectorLayout.small). */
export const isSmallWindow = (width: number, height: number) => width < 600 || height < 500;

/**
 * Sizes for the projector page: the QR as big as the space left under the header allows, the
 * code readable from the back of the room, and everything inside the window.
 */
export function projectorLayout({ width, height, areaWidth, areaHeight, infoHeight }: ProjectorSpace): ProjectorLayout {
  const wide = width >= 600 && width > height * 1.1;
  const small = isSmallWindow(width, height);
  const roomHeight = areaHeight - 2 * AREA_PADDING;
  if (wide) {
    const infoWidth = Math.min(600, Math.max(300, Math.round(areaWidth * 0.42)));
    // "482 913" with 8 px letter spacing is 4.42 times the font size wide plus 56 px: keep some
    // room, or the code breaks onto two lines.
    const codeSize = Math.max(32, Math.min(112, Math.floor((infoWidth - 56) / 4.7), Math.floor(height / 6)));
    const qrSize = Math.min(areaWidth - infoWidth - GAP_WIDE - QR_CARD, roomHeight - QR_CARD);
    return { wide, small, qrSize: Math.max(QR_MIN, Math.floor(qrSize)), codeSize, infoWidth };
  }
  const qrSize = Math.min(areaWidth - QR_CARD, roomHeight - infoHeight - GAP_STACKED - QR_CARD);
  return {
    wide,
    small,
    qrSize: Math.max(QR_MIN, Math.floor(qrSize)),
    codeSize: small ? 52 : 84,
    infoWidth: Math.min(420, Math.floor(areaWidth)),
  };
}
