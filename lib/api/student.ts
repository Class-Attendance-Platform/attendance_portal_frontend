import { api } from './client';
import type { AttendanceStatus, CourseRef, Delivery, ISODate, ISODateTime, LogMethod, Ok, UUID } from './types';

export interface StudentCourseSummary {
  id: UUID;
  course_info_id: UUID;
  course: CourseRef;
  teacher: { userName: string | null; email: string | null };
  totalClasses: number;
  presentCount: number;
  percentage: number;
  history: { date: ISODate; present: boolean }[];
  held: number;
  attended: number;
  percent: number | null;
  below_min: boolean;
  classes_needed: number | null;
}

export interface StudentSemester {
  id: UUID;
  level: string;
  semester: string;
  session: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  is_active: boolean;
  label: string;
  joined_at: ISODate | null;
  left_at: ISODate | null;
  overall_percent: number | null;
  courses: StudentCourseSummary[];
}

export interface StudentSemestersResponse extends Ok {
  semesters: StudentSemester[];
}

export type AbsentReason = 'changed' | 'roll_call' | 'class_photo' | 'not_checked_in';

export interface StudentCourseDay {
  date: ISODate;
  status: AttendanceStatus | null;
  method: LogMethod | null;
  changed: boolean;
  absent_reason: AbsentReason | null;
}

export interface StudentCourseDetail extends Ok {
  course: {
    course_info_id: UUID;
    code: string;
    title: string;
    credits: string;
    teacher_name: string | null;
    semester: { label: string; is_active: boolean; start_date: ISODate | null; end_date: ISODate | null };
  };
  joined_at: ISODate | null;
  left_at: ISODate | null;
  attended: number;
  held: number;
  percent: number | null;
  classes_needed: number | null;
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
  semesters: (userOrProfileId: UUID) => api.get<StudentSemestersResponse>(`/api/student/${userOrProfileId}/semesters/`),

  course: (courseInfoId: UUID) => api.get<StudentCourseDetail>(`/api/student/course-info/${courseInfoId}/`),

  live: () => api.get<StudentLiveResponse>('/api/student/live/'),
};
