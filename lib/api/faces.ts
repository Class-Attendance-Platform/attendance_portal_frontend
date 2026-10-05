import { appendPhoto, type PhotoFile } from '../upload';
import { api, MULTIPART } from './client';
import type { ISODate, ISODateTime, Ok, OkMessage, UUID } from './types';

// Section 8 of the contract: face attendance, unchanged ("as today").
// Class photos are never stored; each student keeps 3 small face crops + numeric templates.

export type FacePose = 'STRAIGHT' | 'LEFT' | 'RIGHT';

export interface FaceStatus {
  registered: boolean;
  registered_at: ISODateTime | null;
  poses: FacePose[];
}

export interface FaceStatusResponse extends Ok, FaceStatus {}

export interface RegisterFacePhotos {
  straight: PhotoFile;
  left: PhotoFile;
  right: PhotoFile;
}

export type FaceSuggestion = 'present' | 'unsure' | 'absent';
/** match / low_match: found in a photo; no_face: never registered; not_found: registered but not seen. */
export type FaceReason = 'match' | 'low_match' | 'no_face' | 'not_found';

export interface FaceBox {
  /** Index of the class photo (0-based). */
  photo: number;
  /** [x1, y1, x2, y2] in that photo's pixels. */
  box: [number, number, number, number];
}

export interface RecognizedStudent {
  /** Student profile id. */
  id: UUID;
  student_id: number;
  name: string;
  status: FaceSuggestion;
  reason: FaceReason;
  score: number | null;
  face: FaceBox | null;
  /** JPEG data URL of the matched face. */
  crop: string | null;
}

export interface RecognizeResult extends Ok {
  photos: { index: number; width: number; height: number }[];
  students: RecognizedStudent[];
  unknown_faces: (FaceBox & { crop: string })[];
  summary: { present: number; unsure: number; absent: number; unknown: number; faces_found: number };
}

export interface ConfirmFaceBody {
  course_info_id: UUID;
  /** Student profile ids marked present. */
  present_student_ids: UUID[];
  /** Default: today. */
  date?: ISODate;
}

export interface ConfirmFaceResponse extends Ok {
  session_id: UUID;
  date: ISODate;
  total_present: number;
}

export interface AdminFaceStatusResponse extends Ok {
  /** {student profile id: registered_at} for students with a face. */
  registered: Record<UUID, ISODateTime>;
}

export interface AdminStudentFacesResponse extends FaceStatusResponse {
  crops: { pose: FacePose; image: string }[];
}

export const facesApi = {
  // Student: own face registration
  /** GET /faces/me/ */
  mine: () => api.get<FaceStatusResponse>('/api/faces/me/'),

  /** POST /faces/me/ (multipart): 3 poses, one face each, with consent. 409 if the face belongs to another student. */
  registerMine: async (photos: RegisterFacePhotos) => {
    const form = new FormData();
    await appendPhoto(form, 'straight', photos.straight);
    await appendPhoto(form, 'left', photos.left);
    await appendPhoto(form, 'right', photos.right);
    form.append('consent', 'true');
    return api.post<FaceStatusResponse>('/api/faces/me/', form, { ...MULTIPART, timeout: 120000 });
  },

  /** DELETE /faces/me/ */
  deleteMine: () => api.delete<OkMessage>('/api/faces/me/'),

  // Teacher: class photos → suggested attendance → confirm
  /** POST /faces/recognize/ (multipart, 1–3 photos). Nothing is saved. */
  recognize: async (courseInfoId: UUID, photos: PhotoFile[]) => {
    const form = new FormData();
    form.append('course_info_id', courseInfoId);
    for (const photo of photos) await appendPhoto(form, 'photos', photo);
    return api.post<RecognizeResult>('/api/faces/recognize/', form, { ...MULTIPART, timeout: 120000 });
  },

  /** POST /faces/confirm/: saves the reviewed list (replaces that date's earlier face result). */
  confirm: (body: ConfirmFaceBody) => api.post<ConfirmFaceResponse>('/api/faces/confirm/', body),

  // Admin
  /** GET /faces/admin/students/ */
  adminStatus: () => api.get<AdminFaceStatusResponse>('/api/faces/admin/students/'),
  /** GET /faces/admin/students/<profile_id>/: the registered crops. */
  adminStudent: (profileId: UUID) => api.get<AdminStudentFacesResponse>(`/api/faces/admin/students/${profileId}/`),
  /** DELETE /faces/admin/students/<profile_id>/: reset a student's face. */
  adminReset: (profileId: UUID) =>
    api.delete<OkMessage & { deleted: number }>(`/api/faces/admin/students/${profileId}/`),
};
