import { api } from './client';
import type { LiveSession } from './sessions';
import type { AttendanceStatus, ISODate, ISODateTime, LogMethod, Ok, OkMessage, SemesterRef, UUID } from './types';

export const TEACHER_ERRORS = {
  noClassOnDate: 'no_class_on_date',
  futureDate: 'future_date',
  sessionRunning: 'session_running',
  dateChanged: 'date_changed',
  outsideSemester: 'outside_semester',
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
  previous: TeacherCourse[];
}

export interface CourseStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
  joined_at: ISODate | null;
  left_at: ISODate | null;
  attended: number;
  held: number;
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
  dates: ClassDate[];
}

export interface StudentDay {
  date: ISODate;
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
  changed: boolean;
  day: Omit<StudentDay, 'status'> & { status: AttendanceStatus };
}

export interface RollCallStudent {
  profile_id: UUID;
  student_id: number;
  name: string;
  joined_at: ISODate | null;
  left_at: ISODate | null;
  status: AttendanceStatus | null;
}

export interface RollCallList extends Ok {
  date: ISODate;
  has_class: boolean;
  live_session_id: UUID | null;
  version: string;
  students: RollCallStudent[];
}

export interface RollCallBody {
  date: ISODate;
  present_profile_ids: UUID[];
  absent_profile_ids?: UUID[];
  version?: string;
}

export interface RollCallResponse extends Ok {
  date: ISODate;
  present: number;
  absent: number;
  unmarked: number;
  changed: number;
}

export interface LiveSessionLookup extends Ok {
  session: LiveSession | null;
}

export const teacherApi = {
  courses: (userOrProfileId: UUID) => api.get<TeacherCoursesResponse>(`/api/teacher/${userOrProfileId}/courses/`),

  course: (courseInfoId: UUID) => api.get<TeacherCourseDetail>(`/api/teacher/course-info/${courseInfoId}/`),

  student: (courseInfoId: UUID, profileId: UUID) =>
    api.get<CourseStudentDetail>(`/api/teacher/course-info/${courseInfoId}/students/${profileId}/`),

  setAttendance: (courseInfoId: UUID, body: SetAttendanceBody) =>
    api.put<SetAttendanceResponse>(`/api/teacher/course-info/${courseInfoId}/attendance/`, body),

  rollCallList: (courseInfoId: UUID, date: ISODate) =>
    api.get<RollCallList>(`/api/teacher/course-info/${courseInfoId}/roll-call/`, { date }),

  rollCall: (courseInfoId: UUID, body: RollCallBody) =>
    api.post<RollCallResponse>(`/api/teacher/course-info/${courseInfoId}/roll-call/`, body),

  deleteClass: (courseInfoId: UUID, date: ISODate) =>
    api.delete<Ok & { message?: string }>(`/api/teacher/course-info/${courseInfoId}/history-session/${date}/`),

  liveSession: (courseInfoId: UUID) => api.get<LiveSessionLookup>(`/api/teacher/course-info/${courseInfoId}/live/`),
};
