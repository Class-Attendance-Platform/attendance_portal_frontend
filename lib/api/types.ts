export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type Level = string;
export type Term = string;

export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type CheckInMethod = 'QR' | 'CODE' | 'TEACHER' | 'FINGERPRINT';
export type LogMethod = 'QR' | 'CODE' | 'FACE' | 'TEACHER' | 'FINGERPRINT';
export type Delivery = 'IN_CLASS' | 'ONLINE';

export interface Ok {
  success: true;
}

export interface OkMessage extends Ok {
  message: string;
}

export interface StudentProfileRef {
  id: UUID;
  student_id: number;
  current_level: Level;
  current_semester: Term;
}

export interface TeacherProfileRef {
  id: UUID;
  employee_id: string;
}

export interface User {
  id: UUID;
  userName: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_verified: boolean;
  date_joined: ISODateTime;
  student_profile: StudentProfileRef | null;
  teacher_profile: TeacherProfileRef | null;
}

export interface SemesterRef {
  id: UUID;
  label: string;
  is_active: boolean;
  start_date: ISODate | null;
  end_date: ISODate | null;
}

export interface CourseRef {
  id: UUID;
  code: string;
  title: string;
  credits: string;
}

export interface PersonRef {
  id: UUID;
  name: string;
}
