import { getDeviceId } from '../device';
import { api } from './client';
import type {
  AttendanceStatus,
  CheckInMethod,
  Delivery,
  ISODate,
  ISODateTime,
  LogMethod,
  Ok,
  OkMessage,
  UUID,
} from './types';

export const SESSION_ERRORS = {
  sessionRunning: 'session_running',
  codeInvalid: 'code_invalid',
  notEnrolled: 'not_enrolled',
  alreadyCheckedIn: 'already_checked_in',
  deviceUsed: 'device_used',
  sessionEnded: 'session_ended',
  semesterFinished: 'semester_finished',
  tooLong: 'too_long',
} as const;

export type SessionMinutes = 2 | 5 | 10 | 15;

export interface LiveSession {
  id: UUID;
  course_info_id: UUID;
  delivery: Delivery;
  date: ISODate;
  started_at: ISODateTime;
  ends_at: ISODateTime;
  time_left: number;
  code_period: number;
}

export interface StartSessionBody {
  course_info_id: UUID;
  delivery: Delivery;
  duration_minutes: SessionMinutes;
}

export interface StartSessionResponse extends Ok {
  session: LiveSession;
}

export interface SessionCode extends Ok {
  code: string;
  check_in_url: string;
  expires_in: number;
  period: number;
}

export interface CheckedInStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
  time: ISODateTime;
  method: CheckInMethod;
}

export interface WaitingStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
}

export interface LiveStatus extends Ok {
  active: true;
  session: {
    id: UUID;
    delivery: Delivery;
    ends_at: ISODateTime;
    time_left: number;
    total: number;
    checked_in: CheckedInStudent[];
    not_checked_in: WaitingStudent[];
  };
}

export interface EndedStatus extends Ok {
  active: false;
  session_id: UUID;
  saved: boolean;
  total_present: number;
}

export type SessionStatus = LiveStatus | EndedStatus;

export interface ExtendResponse extends Ok {
  ends_at: ISODateTime;
  time_left: number;
}

export interface StopResponse extends Ok {
  message?: string;
  total_present: number;
}

export interface CheckInBody {
  code: string;
  session_id?: UUID;
}

export interface CheckInResponse extends OkMessage {
  course: { code: string; title: string };
  time: ISODateTime;
}

export interface HistoryLog {
  profile_id: UUID;
  student_id: number;
  name: string;
  status: AttendanceStatus;
  method: LogMethod | null;
  changed_by: string | null;
  changed_at: ISODateTime | null;
}

export interface HistoryDay {
  date: ISODate;
  sessions: { session_id: UUID; delivery: Delivery; mode: string }[];
  logs: HistoryLog[];
}

export interface HistoryResponse extends Ok {
  course_info_id?: UUID;
  history: HistoryDay[];
}

export interface HistoryFilter {
  date?: ISODate;
  profileId?: UUID;
}

export interface MarkResponse extends OkMessage {
  student: CheckedInStudent;
}

export const sessionsApi = {
  start: (body: StartSessionBody) => api.post<StartSessionResponse>('/api/sessions/start/', body),

  code: (sessionId: UUID) => api.get<SessionCode>(`/api/sessions/${sessionId}/code/`),

  status: (sessionId: UUID) => api.get<SessionStatus>(`/api/sessions/${sessionId}/status/`),

  extend: (sessionId: UUID, minutes = 2) => api.post<ExtendResponse>(`/api/sessions/${sessionId}/extend/`, { minutes }),

  mark: (sessionId: UUID, profileId: UUID) =>
    api.post<MarkResponse>(`/api/sessions/${sessionId}/mark/`, { profile_id: profileId }),

  stop: (sessionId: UUID) => api.post<StopResponse>(`/api/sessions/${sessionId}/stop/`),

  cancel: (sessionId: UUID) => api.post<Ok & { message?: string }>(`/api/sessions/${sessionId}/cancel/`),

  checkIn: async (body: CheckInBody) => {
    const device_id = await getDeviceId();
    return api.post<CheckInResponse>('/api/sessions/check-in/', { ...body, code: body.code.replace(/\s+/g, ''), device_id });
  },

  history: (courseInfoId: UUID, { date, profileId }: HistoryFilter = {}) =>
    api.get<HistoryResponse>(`/api/sessions/course-info/${courseInfoId}/history/`, { date, student_id: profileId }),
};
