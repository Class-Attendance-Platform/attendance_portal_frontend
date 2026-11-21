export function codeValidUntil(askedAt: number, expiresIn: number, period: number): number {
  const window = Number.isFinite(period) && period > 0 ? period : 30;
  const left = Number.isFinite(expiresIn) ? Math.min(window, Math.max(0, expiresIn)) : 0;
  return askedAt + (left + window - 1) * 1000;
}

export const QR_MIN = 140;
const QR_CARD = 34;
const AREA_PADDING = 16;
const GAP_WIDE = 48;
const GAP_STACKED = 24;

export type ProjectorSpace = {
  width: number;
  height: number;
  areaWidth: number;
  areaHeight: number;
  infoHeight: number;
};

export type ProjectorLayout = {
  wide: boolean;
  small: boolean;
  qrSize: number;
  codeSize: number;
  infoWidth: number;
};

export const isSmallWindow = (width: number, height: number) => width < 600 || height < 500;

export function projectorLayout({ width, height, areaWidth, areaHeight, infoHeight }: ProjectorSpace): ProjectorLayout {
  const wide = width >= 600 && width > height * 1.1;
  const small = isSmallWindow(width, height);
  const roomHeight = areaHeight - 2 * AREA_PADDING;
  if (wide) {
    const infoWidth = Math.min(600, Math.max(300, Math.round(areaWidth * 0.42)));
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
