// Shared types for the API (contract: attendance_portal_backend/docs/api-v2.md).
// Existing keys keep their names (some camelCase, e.g. `userName`); new keys are snake_case.

/** Database id (UUID). */
export type UUID = string;
/** `YYYY-MM-DD`, Asia/Dhaka local date. */
export type ISODate = string;
/** ISO 8601 date-time with offset. */
export type ISODateTime = string;

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** "First" | "Second" | "Third" | "Fourth" (see GET /config/app/ `levels`). */
export type Level = string;
/** "I" | "II" (see GET /config/app/ `terms`). */
export type Term = string;

export type AttendanceStatus = 'PRESENT' | 'ABSENT';
/** How a student was marked in a live session (FINGERPRINT only from the hidden fingerprint devices). */
export type CheckInMethod = 'QR' | 'CODE' | 'TEACHER' | 'FINGERPRINT';
/** How a saved attendance log was made (FINGERPRINT: older fingerprint-device logs). */
export type LogMethod = 'QR' | 'CODE' | 'FACE' | 'TEACHER' | 'FINGERPRINT';
export type Delivery = 'IN_CLASS' | 'ONLINE';

/** Every successful response has `success: true`. */
export interface Ok {
  success: true;
}

export interface OkMessage extends Ok {
  message: string;
}

export interface StudentProfileRef {
  id: UUID;
  /** University roll number, e.g. 2302001. */
  student_id: number;
  current_level: Level;
  current_semester: Term;
}

export interface TeacherProfileRef {
  id: UUID;
  employee_id: string;
}

/** Returned by POST /auth/login/ and GET/PATCH /auth/me/. */
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
}

export interface CourseRef {
  id: UUID;
  code: string;
  title: string;
  /** Credit enum, e.g. "CREDIT_3_00" (see GET /config/credits/). */
  credits: string;
}

export interface PersonRef {
  id: UUID;
  name: string;
}
