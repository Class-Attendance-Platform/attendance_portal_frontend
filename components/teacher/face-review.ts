export const MAX_PHOTO_MB = 10;
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 50_000_000;

export type PhotoProblem = 'not_photo' | 'too_big' | 'too_many_pixels';

export type PickedFile = {
  type?: string | null;
  mimeType?: string | null;
  width: number;
  height: number;
  fileSize?: number | null;
};

export function photoProblem(file: PickedFile, web: boolean): PhotoProblem | null {
  if (file.type === 'video' || (file.mimeType && !file.mimeType.toLowerCase().startsWith('image/'))) return 'not_photo';
  if (web && !(file.width > 0 && file.height > 0)) return 'not_photo';
  if (web && (file.fileSize ?? 0) > MAX_PHOTO_BYTES) return 'too_big';
  if (file.width * file.height > MAX_PHOTO_PIXELS) return 'too_many_pixels';
  return null;
}

const ONE_FILE: Record<PhotoProblem, string> = {
  not_photo: 'That file is not a photo. Choose a JPG or PNG image.',
  too_big: `That photo is larger than ${MAX_PHOTO_MB} MB. Choose a smaller photo.`,
  too_many_pixels: 'That photo is too large. Use a normal camera photo.',
};

const RULE: Record<PhotoProblem, string> = {
  not_photo: 'Only JPG or PNG photos can be used.',
  too_big: `A photo can be ${MAX_PHOTO_MB} MB at most.`,
  too_many_pixels: 'Use normal camera photos.',
};

export function photoProblemText(problems: PhotoProblem[], picked: number): string | null {
  if (!problems.length) return null;
  if (picked <= 1) return ONE_FILE[problems[0]];
  const rule = new Set(problems).size === 1 ? RULE[problems[0]] : `Use JPG or PNG photos of ${MAX_PHOTO_MB} MB at most.`;
  return `${problems.length} of the ${picked} files ${problems.length === 1 ? 'was' : 'were'} not added. ${rule}`;
}

export function extraPhotosText(room: number, max: number): string {
  return room === 1
    ? `Only ${max} photos can be used, so only the first one was added.`
    : `Only ${max} photos can be used, so only the first ${room} were added.`;
}

export function noFacesText(photoCount: number): string {
  return `No faces were found in the ${photoCount === 1 ? 'photo' : 'photos'}. Take a closer, well-lit photo, or use roll call.`;
}

export type Marks = Record<string, boolean>;

type Suggestion = { id: string; status: string; reason: string };

export function suggestedPresent(student: Suggestion): boolean {
  return student.status === 'present' || student.reason === 'low_match';
}

export function correctedMarks(
  logs: { profile_id: string; status: string; method?: string | null; changed_by: string | null; changed_at: string | null }[]
): Marks {
  const marks: Marks = {};
  for (const log of logs) {
    if (log.changed_by || log.changed_at || log.method === 'TEACHER') marks[log.profile_id] = log.status === 'PRESENT';
  }
  return marks;
}

export function withCorrections(students: Suggestion[], corrected: Marks, marks?: Marks): Marks {
  const next: Marks = {};
  for (const student of students) {
    const suggested = suggestedPresent(student);
    const current = marks?.[student.id] ?? suggested;
    const correction = corrected[student.id];
    next[student.id] = correction !== undefined && current === suggested ? correction : current;
  }
  return next;
}

export function presentIds(students: Suggestion[], marks: Marks): string[] {
  return students.filter((student) => marks[student.id]).map((student) => student.id);
}

export function teacherMarkedIds(students: Suggestion[], marks: Marks): string[] {
  return students
    .filter((student) => marks[student.id] && (student.reason === 'no_face' || student.reason === 'not_found'))
    .map((student) => student.id);
}

export function facesShown(result: { students: { face: unknown }[]; unknown_faces: unknown[] }): number {
  return result.students.filter((student) => student.face).length + result.unknown_faces.length;
}

export function skippedText(skipped: { name: string }[]): string | null {
  if (!skipped.length) return null;
  if (skipped.length === 1) return `${skipped[0].name} was not saved: no longer on this course's class list.`;
  return `${skipped.length} students were not saved because they are no longer on this course's class list: ${skipped
    .map((student) => student.name)
    .join(', ')}.`;
}
