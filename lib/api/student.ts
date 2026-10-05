import { api } from './client';
import type { AttendanceStatus, CourseRef, Delivery, ISODate, ISODateTime, LogMethod, Ok, UUID } from './types';

// Section 7 of the contract (plus the student's "Live now" lookup from section 5).
// Checking in is in lib/api/sessions.ts (`sessionsApi.checkIn`).

export interface StudentCourseSummary {
  /** Course info id (older key; same as `course_info_id`). */
  id: UUID;
  course_info_id: UUID;
  course: CourseRef;
  teacher: { userName: string | null; email: string | null };
  /** Older keys, kept by the server. */
  totalClasses: number;
  presentCount: number;
  percentage: number;
  history: { date: ISODate; present: boolean }[];
  /** Classes held since the student joined. */
  held: number;
  attended: number;
  /** attended / held; null when no class was held yet. */
  percent: number | null;
  below_min: boolean;
  /** Classes in a row needed to reach the minimum; 0 if already there. */
  classes_needed: number;
}

export interface StudentSemester {
  id: UUID;
  level: string;
  semester: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  /** False = finished. */
  is_active: boolean;
  /** "Level 3 · Term I · 2025-26" */
  label: string;
  overall_percent: number | null;
  courses: StudentCourseSummary[];
}

export interface StudentSemestersResponse extends Ok {
  /** Sorted by level then term. Only the student's own class group's courses. */
  semesters: StudentSemester[];
}

export interface StudentCourseDay {
  date: ISODate;
  status: AttendanceStatus | null;
  method: LogMethod | null;
  /** A teacher changed this day after it was saved. */
  changed: boolean;
}

export interface StudentCourseDetail extends Ok {
  course: {
    course_info_id: UUID;
    code: string;
    title: string;
    credits: string;
    teacher_name: string | null;
    semester: { label: string; is_active: boolean };
  };
  attended: number;
  held: number;
  percent: number | null;
  classes_needed: number;
  days: StudentCourseDay[];
}

export interface StudentLiveSession {
  session_id: UUID;
  course_info_id: UUID;
  course: { code: string; title: string };
  delivery: Delivery;
  ends_at: ISODateTime;
  checked_in: boolean;
}

export interface StudentLiveResponse extends Ok {
  sessions: StudentLiveSession[];
}

export const studentApi = {
  /** GET /student/<user_or_profile_id>/semesters/ */
  semesters: (userOrProfileId: UUID) => api.get<StudentSemestersResponse>(`/api/student/${userOrProfileId}/semesters/`),

  /** GET /student/course-info/<id>/ (the signed-in student's own course; 403 otherwise). */
  course: (courseInfoId: UUID) => api.get<StudentCourseDetail>(`/api/student/course-info/${courseInfoId}/`),

  /** GET /student/live/: live sessions in the student's current courses. Poll every 20–30 s. */
  live: () => api.get<StudentLiveResponse>('/api/student/live/'),
};
