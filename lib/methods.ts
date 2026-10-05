// How a class day was marked, in the same words for students, teachers and admins.
// No imports, so tests/methods.test.mjs can run it in Node (npm test).

const METHOD_LABELS: Record<string, string> = {
  QR: 'QR scan',
  CODE: 'Typed code',
  FACE: 'Class photo',
  TEACHER: 'Marked by teacher',
  // Older logs from the fingerprint devices (hidden in the app).
  FINGERPRINT: 'Device',
};

/** "QR scan", "Typed code", "Class photo", "Marked by teacher"; '' when not checked in. */
export function methodLabel(method: string | null | undefined): string {
  return (method && METHOD_LABELS[method]) || '';
}
