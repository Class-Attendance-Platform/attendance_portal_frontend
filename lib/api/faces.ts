import { appendPhoto, type PhotoFile } from '../upload';
import { api, MULTIPART } from './client';
import type { ISODate, ISODateTime, Ok, OkMessage, UUID } from './types';

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
export type FaceReason = 'match' | 'low_match' | 'no_face' | 'not_found';

export interface FaceBox {
  photo: number;
  box: [number, number, number, number];
}

export interface RecognizedStudent {
  id: UUID;
  student_id: number;
  name: string;
  status: FaceSuggestion;
  reason: FaceReason;
  score: number | null;
  face: FaceBox | null;
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
  present_student_ids: UUID[];
  teacher_marked_ids?: UUID[];
  date?: ISODate;
}

export interface ConfirmFaceResponse extends Ok {
  session_id: UUID;
  date: ISODate;
  total_present: number;
  skipped: { profile_id: UUID; name: string }[];
}

export interface AdminFaceStatusResponse extends Ok {
  registered: Record<UUID, ISODateTime>;
}

export interface AdminStudentFacesResponse extends FaceStatusResponse {
  crops: { pose: FacePose; image: string }[];
}

const faceListeners = new Set<() => void>();

export function onFaceChange(listener: () => void): () => void {
  faceListeners.add(listener);
  return () => {
    faceListeners.delete(listener);
  };
}

export function notifyFaceChange() {
  for (const listener of Array.from(faceListeners)) {
    try {
      listener();
    } catch {
    }
  }
}

export const facesApi = {
  mine: () => api.get<FaceStatusResponse>('/api/faces/me/'),

  registerMine: async (photos: RegisterFacePhotos) => {
    const form = new FormData();
    await appendPhoto(form, 'straight', photos.straight);
    await appendPhoto(form, 'left', photos.left);
    await appendPhoto(form, 'right', photos.right);
    form.append('consent', 'true');
    const result = await api.post<FaceStatusResponse>('/api/faces/me/', form, { ...MULTIPART, timeout: 120000 });
    notifyFaceChange();
    return result;
  },

  deleteMine: async () => {
    const result = await api.delete<OkMessage>('/api/faces/me/');
    notifyFaceChange();
    return result;
  },

  recognize: async (courseInfoId: UUID, photos: PhotoFile[]) => {
    const form = new FormData();
    form.append('course_info_id', courseInfoId);
    for (const photo of photos) await appendPhoto(form, 'photos', photo);
    return api.post<RecognizeResult>('/api/faces/recognize/', form, { ...MULTIPART, timeout: 120000 });
  },

  confirm: (body: ConfirmFaceBody) => api.post<ConfirmFaceResponse>('/api/faces/confirm/', body),

  adminStatus: () => api.get<AdminFaceStatusResponse>('/api/faces/admin/students/'),
  adminStudent: (profileId: UUID) => api.get<AdminStudentFacesResponse>(`/api/faces/admin/students/${profileId}/`),
  adminReset: (profileId: UUID) =>
    api.delete<OkMessage & { deleted: number }>(`/api/faces/admin/students/${profileId}/`),
};
