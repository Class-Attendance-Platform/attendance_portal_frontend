const METHOD_LABELS: Record<string, string> = {
  QR: 'QR scan',
  CODE: 'Typed code',
  FACE: 'Class photo',
  TEACHER: 'Marked by teacher',
  FINGERPRINT: 'Device',
};

export function methodLabel(method: string | null | undefined): string {
  return (method && METHOD_LABELS[method]) || '';
}
