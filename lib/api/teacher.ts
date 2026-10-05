import { api } from './client';
import type { LiveSession } from './sessions';
import type { AttendanceStatus, ISODate, ISODateTime, LogMethod, Ok, OkMessage, SemesterRef, UUID } from './types';

// Section 6 of the contract: teacher courses, students, corrections, roll call.
// Admins can call these too (they pass `can_manage_course`); the admin UI is read-only.
// The course history list is in lib/api/sessions.ts (`sessionsApi.history`).

/** Machine codes on errors (`ApiError.code`). */
export const TEACHER_ERRORS = {
  noClassOnDate: 'no_class_on_date',
  futureDate: 'future_date',
  /** Roll call: a live session runs on that date (the error has `session_id`). */
  sessionRunning: 'session_running',
  /** Roll call: the date changed since the list was loaded (`version` no longer matches). */
  dateChanged: 'date_changed',
} as const;

export interface TeacherCourse {
  course_info_id: UUID;
  code: string;
  title: string;
  credits: string;
  semester: SemesterRef;
  student_count: number;
  classes_held: number;
  average_percent: number | null;
  below_min_count: number;
  face_registered_count: number;
  live_session_id: UUID | null;
}

export interface TeacherCoursesResponse extends Ok {
  current: TeacherCourse[];
  /** Finished semesters: view and export only. */
  previous: TeacherCourse[];
}

export interface CourseStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
  joined_at: ISODate | null;
  left_at: ISODate | null;
  attended: number;
  /** Class dates on or after `joined_at` (and before `left_at`). */
  held: number;
  /** attended / held; null when held = 0. */
  percent: number | null;
  below_min: boolean;
  face_registered: boolean;
}

export interface ClassDate {
  date: ISODate;
  present: number;
  total: number;
}

export interface TeacherCourseDetail extends Ok {
  course: TeacherCourse;
  students: CourseStudent[];
  /** Newest first; one date = one class. */
  dates: ClassDate[];
}

export interface StudentDay {
  date: ISODate;
  /** null = not enrolled yet on that date. */
  status: AttendanceStatus | null;
  method: LogMethod | null;
  changed_by: string | null;
  changed_at: ISODateTime | null;
}

export interface CourseStudentDetail extends Ok {
  student: {
    profile_id: UUID;
    student_id: number;
    name: string;
    email: string;
    joined_at: ISODate | null;
    left_at: ISODate | null;
    attended: number;
    held: number;
    percent: number | null;
  };
  days: StudentDay[];
}

export interface SetAttendanceBody {
  date: ISODate;
  profile_id: UUID;
  status: AttendanceStatus;
}

export interface SetAttendanceResponse extends OkMessage {
  /** false: the student already had this status. */
  changed: boolean;
  day: Omit<StudentDay, 'status'> & { status: AttendanceStatus };
}

export interface RollCallStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
  joined_at: ISODate | null;
  /** Set for a student who has left since (still enrolled on this date). */
  left_at: ISODate | null;
  /** Their status that day (as in the history); null = no log that day. */
  status: AttendanceStatus | null;
}

export interface RollCallList extends Ok {
  date: ISODate;
  has_class: boolean;
  /** A live session of the course on this date (still taking check-ins). */
  live_session_id: UUID | null;
  /** Send it back with the roll call: the server refuses (409 date_changed) if the date changed since. */
  version: string;
  /** Everyone enrolled on the date (also students who left since), by student id. */
  students: RollCallStudent[];
}

export interface RollCallBody {
  date: ISODate;
  present_profile_ids: UUID[];
  /** The `version` of the list the page showed. */
  version?: string;
}

export interface RollCallResponse extends Ok {
  date: ISODate;
  present: number;
  absent: number;
  changed: number;
}

export interface LiveSessionLookup extends Ok {
  session: LiveSession | null;
}

export const teacherApi = {
  /** GET /teacher/<user_or_profile_id>/courses/ */
  courses: (userOrProfileId: UUID) => api.get<TeacherCoursesResponse>(`/api/teacher/${userOrProfileId}/courses/`),

  /** GET /teacher/course-info/<id>/: course, students with percentages, class dates. */
  course: (courseInfoId: UUID) => api.get<TeacherCourseDetail>(`/api/teacher/course-info/${courseInfoId}/`),

  /** GET /teacher/course-info/<id>/students/<profile_id>/: one student's days. */
  student: (courseInfoId: UUID, profileId: UUID) =>
    api.get<CourseStudentDetail>(`/api/teacher/course-info/${courseInfoId}/students/${profileId}/`),

  /**
   * PUT /teacher/course-info/<id>/attendance/: changes one student on a date that already has a
   * class. 404 no_class_on_date (use roll call), 400 for future dates.
   */
  setAttendance: (courseInfoId: UUID, body: SetAttendanceBody) =>
    api.put<SetAttendanceResponse>(`/api/teacher/course-info/${courseInfoId}/attendance/`, body),

  /** GET /teacher/course-info/<id>/roll-call/?date=: who a roll call for the date covers, with status. */
  rollCallList: (courseInfoId: UUID, date: ISODate) =>
    api.get<RollCallList>(`/api/teacher/course-info/${courseInfoId}/roll-call/`, { date }),

  /**
   * POST /teacher/course-info/<id>/roll-call/: creates or corrects a date's class. 400 future_date;
   * 409 session_running (a live session that day) or date_changed (stale `version`).
   */
  rollCall: (courseInfoId: UUID, body: RollCallBody) =>
    api.post<RollCallResponse>(`/api/teacher/course-info/${courseInfoId}/roll-call/`, body),

  /** DELETE /teacher/course-info/<id>/history-session/<date>/: deletes that date's classes and logs. */
  deleteClass: (courseInfoId: UUID, date: ISODate) =>
    api.delete<Ok & { message?: string }>(`/api/teacher/course-info/${courseInfoId}/history-session/${date}/`),

  /** GET /teacher/course-info/<id>/live/: the running session, to reopen it after a reload. */
  liveSession: (courseInfoId: UUID) => api.get<LiveSessionLookup>(`/api/teacher/course-info/${courseInfoId}/live/`),
};
