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

// Section 5 of the contract: live attendance sessions with a rotating 6-digit code,
// plus the course history list from section 6.

/** Machine codes on errors (`ApiError.code`). */
export const SESSION_ERRORS = {
  /** 409 on start; `error.body.session_id` is the running session. */
  sessionRunning: 'session_running',
  codeInvalid: 'code_invalid',
  notEnrolled: 'not_enrolled',
  alreadyCheckedIn: 'already_checked_in',
  deviceUsed: 'device_used',
  sessionEnded: 'session_ended',
  /** 400 on start (and on face recognize/confirm): the course's semester is finished. */
  semesterFinished: 'semester_finished',
} as const;

export type SessionMinutes = 2 | 5 | 10 | 15;

export interface LiveSession {
  id: UUID;
  course_info_id: UUID;
  delivery: Delivery;
  date: ISODate;
  started_at: ISODateTime;
  ends_at: ISODateTime;
  /** Seconds left. */
  time_left: number;
  /** Seconds between code changes (30). */
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
  /** 6 digits, zero-padded, e.g. "482913". */
  code: string;
  /** `{WEB_URL}/check-in?s=<session_id>&c=<code>`: show it as the QR. */
  check_in_url: string;
  /** Seconds until the code changes. */
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
  /** From the QR link; leave out for a typed code (the server finds the session). */
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
  /** How the student was marked; null when absent in a live or face session. */
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
  /** Only this date (`YYYY-MM-DD`). */
  date?: ISODate;
  /** Only this student (profile id). */
  profileId?: UUID;
}

export interface MarkResponse extends OkMessage {
  student: CheckedInStudent;
}

export const sessionsApi = {
  /** POST /sessions/start/. 409 session_running (see SESSION_ERRORS). */
  start: (body: StartSessionBody) => api.post<StartSessionResponse>('/api/sessions/start/', body),

  /** GET /sessions/<id>/code/: the current code. Poll every few seconds. */
  code: (sessionId: UUID) => api.get<SessionCode>(`/api/sessions/${sessionId}/code/`),

  /** GET /sessions/<id>/status/: live lists, or the saved result once it ended. */
  status: (sessionId: UUID) => api.get<SessionStatus>(`/api/sessions/${sessionId}/status/`),

  /** POST /sessions/<id>/extend/ (max 30 minutes in total). */
  extend: (sessionId: UUID, minutes = 2) => api.post<ExtendResponse>(`/api/sessions/${sessionId}/extend/`, { minutes }),

  /** POST /sessions/<id>/mark/: the teacher checks a student in while the session is live. */
  mark: (sessionId: UUID, profileId: UUID) =>
    api.post<MarkResponse>(`/api/sessions/${sessionId}/mark/`, { profile_id: profileId }),

  /** POST /sessions/<id>/stop/: ends and saves now. */
  stop: (sessionId: UUID) => api.post<StopResponse>(`/api/sessions/${sessionId}/stop/`),

  /** POST /sessions/<id>/cancel/: discards the session; nothing is saved. */
  cancel: (sessionId: UUID) => api.post<Ok & { message?: string }>(`/api/sessions/${sessionId}/cancel/`),

  /**
   * POST /sessions/check-in/ (student). Adds this install's `device_id`. Errors: 400 code_invalid,
   * 403 not_enrolled, 409 already_checked_in / device_used, 410 session_ended.
   */
  checkIn: async (body: CheckInBody) => {
    const device_id = await getDeviceId();
    return api.post<CheckInResponse>('/api/sessions/check-in/', { ...body, code: body.code.replace(/\s+/g, ''), device_id });
  },

  /** GET /sessions/course-info/<id>/history/: every class date with its logs (newest first). */
  history: (courseInfoId: UUID, { date, profileId }: HistoryFilter = {}) =>
    api.get<HistoryResponse>(`/api/sessions/course-info/${courseInfoId}/history/`, { date, student_id: profileId }),
};
