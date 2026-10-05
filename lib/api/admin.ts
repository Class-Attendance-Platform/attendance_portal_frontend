import { appendFile, type UploadFile } from '../upload';
import { api, MULTIPART } from './client';
import type { Delivery, ISODate, ISODateTime, Level, Ok, OkMessage, PersonRef, Role, Term, UUID } from './types';

// Sections 2–4 of the contract. Every endpoint needs role ADMIN.
// Admins read a course's attendance through lib/api/teacher.ts and lib/api/sessions.ts.

/** Machine codes on errors (`ApiError.code`). */
export const ADMIN_ERRORS = {
  levelHasActiveSemester: 'level_has_active_semester',
} as const;

// ---- People: approvals ------------------------------------------------------------------------

export interface PendingUser {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  date_joined: ISODateTime;
  student_id?: number;
  current_level?: Level;
  current_semester?: Term;
  employee_id?: string;
}

export interface PendingUsersResponse extends Ok {
  /** Oldest first. */
  users: PendingUser[];
}

// ---- People: students and teachers --------------------------------------------------------------

export type PersonStatus = 'active' | 'deleted';

export interface AdminStudent {
  /** Student profile id. */
  id: UUID;
  user_id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  userName: string;
  student_id: number;
  current_level: Level;
  current_semester: Term;
  is_verified: boolean;
  is_active: boolean;
  deleted: boolean;
  last_login: ISODateTime | null;
  face_registered: boolean;
  /** The current active semester they are in. */
  semester: { id: UUID; label: string } | null;
}

export interface StudentQuery {
  /** Name, email or student id. */
  search?: string;
  level?: Level;
  /** Term ("I" / "II"). */
  semester?: Term;
  status?: PersonStatus;
}

export interface CreateStudentBody {
  email: string;
  first_name: string;
  last_name: string;
  student_id: number;
  current_level: Level;
  current_semester: Term;
  /** Temporary password; the account is approved. */
  password: string;
}

export type UpdateStudentBody = Partial<Omit<CreateStudentBody, 'password'>>;

export interface AdminTeacher {
  /** Teacher profile id. */
  id: UUID;
  user_id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  userName: string;
  employee_id: string;
  is_verified: boolean;
  is_active: boolean;
  deleted: boolean;
  last_login: ISODateTime | null;
  course_count: number;
}

export interface TeacherQuery {
  search?: string;
  status?: PersonStatus;
}

export interface CreateTeacherBody {
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  password: string;
}

export type UpdateTeacherBody = Partial<Omit<CreateTeacherBody, 'password'>>;

// ---- Student import -----------------------------------------------------------------------------

export type ImportRowStatus = 'create' | 'exists' | 'error';

export interface ImportRow {
  /** Spreadsheet row number (the header is row 1). */
  row: number;
  student_id: number | string | null;
  name: string;
  email: string;
  level: string;
  term: string;
  status: ImportRowStatus;
  errors: string[];
}

export interface ImportResult extends Ok {
  applied: boolean;
  summary: { create: number; exists: number; error: number };
  rows: ImportRow[];
  /** Only when applied. Temporary passwords are shown once. */
  created: { student_id: number; email: string; temporary_password: string }[];
}

export interface ImportOptions {
  /** .csv or .xlsx */
  file: UploadFile;
  /** false = dry run (default). */
  apply?: boolean;
  /** Also add every new student to this semester. */
  semesterId?: UUID;
}

// ---- Semesters ----------------------------------------------------------------------------------

export interface Semester {
  id: UUID;
  level: Level;
  semester: Term;
  /** "2025-26" */
  session: string;
  /** "Level 3 · Term I · 2025-26" */
  label: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  /** false = finished */
  is_active: boolean;
  deleted: boolean;
  classroom_id: UUID;
  student_count: number;
  course_count: number;
}

/** Default: all that are not deleted. */
export type SemesterStatus = 'active' | 'finished' | 'deleted' | 'all';

export interface CreateSemesterBody {
  level: Level;
  semester: Term;
  session: string;
  start_date?: ISODate | null;
  end_date?: ISODate | null;
}

export interface UpdateSemesterBody {
  session?: string;
  start_date?: ISODate | null;
  end_date?: ISODate | null;
}

export interface SemesterResponse extends Ok {
  semester: Semester;
}

export interface RosterMember {
  profile_id: UUID;
  student_id: number;
  name: string;
  email: string;
  joined_at: ISODate | null;
  left_at: ISODate | null;
}

export interface RosterResponse extends Ok {
  /** Current members first. */
  students: RosterMember[];
}

export interface AddRosterResponse extends OkMessage {
  /** New members. */
  added: number;
  /** Former members who came back (their first joined date is kept). */
  rejoined: number;
  /** Already current members (nothing changed). */
  already_in: number;
}

export interface RemoveRosterResponse extends OkMessage {
  removed: number;
}

/** A course's teacher; `deleted`: their account was deleted (choose another teacher). */
export interface TeacherRef extends PersonRef {
  deleted?: boolean;
}

export interface SemesterCourse {
  course_info_id: UUID;
  course: { id: UUID; code: string; title: string; credits: string };
  teacher: TeacherRef | null;
}

export interface SemesterCoursesResponse extends Ok {
  courses: SemesterCourse[];
}

export interface PromoteBody {
  /** Create (or reuse) this semester as the target... */
  target: CreateSemesterBody | null;
  /** ...or move into an existing one. */
  target_semester_id?: UUID;
  /** Default: all current members. */
  profile_ids?: UUID[];
}

export interface PromoteResponse extends Ok {
  target_semester_id: UUID;
  moved: number;
}

// ---- Courses ------------------------------------------------------------------------------------

export interface Course {
  id: UUID;
  code: string;
  title: string;
  content: string;
  /** Credit enum, e.g. "CREDIT_3_00". */
  credits: string;
  faculty: string;
  department: string;
  deleted?: boolean;
}

export interface CreateCourseBody {
  code: string;
  title: string;
  credits: string;
  content?: string;
}

export type UpdateCourseBody = Partial<CreateCourseBody>;

// ---- Overview and attendance ----------------------------------------------------------------------

export interface Overview extends Ok {
  counts: {
    students: number;
    teachers: number;
    courses: number;
    active_semesters: number;
    pending_approvals: number;
  };
  semesters: {
    id: UUID;
    label: string;
    student_count: number;
    course_count: number;
    average_percent: number | null;
    below_min_count: number;
  }[];
  /** The last 10 saved sessions. */
  recent_sessions: {
    session_id: UUID;
    course_info_id: UUID;
    course_code: string;
    course_title: string;
    date: ISODate;
    delivery: Delivery;
    mode: string;
    present: number;
    total: number;
  }[];
}

export interface AdminCourseInfo {
  id: UUID;
  course: { code: string; title: string };
  teacher: TeacherRef | null;
  semester: { id: UUID; label: string; is_active: boolean };
  student_count: number;
  classes_held: number;
  average_percent: number | null;
}

export interface AdminCourseInfosResponse extends Ok {
  course_infos: AdminCourseInfo[];
}

// ---------------------------------------------------------------------------------------------------

export const adminApi = {
  // Approvals
  /** GET /admin/users/pending/ */
  pendingUsers: () => api.get<PendingUsersResponse>('/api/admin/users/pending/'),
  /** POST /admin/users/<user_id>/verify/: approve a sign-up. */
  approveUser: (userId: UUID) => api.post<OkMessage>(`/api/admin/users/${userId}/verify/`),
  /** POST /admin/users/<user_id>/reject/: soft-deletes the sign-up. */
  rejectUser: (userId: UUID) => api.post<Ok & { message?: string }>(`/api/admin/users/${userId}/reject/`),
  /** POST /admin/users/<user_id>/reset-password/ with a temporary password (signs the user out). */
  resetPassword: (userId: UUID, newPassword: string) =>
    api.post<OkMessage>(`/api/admin/users/${userId}/reset-password/`, { new_password: newPassword }),

  // Students
  /** GET /admin/students/ */
  students: (query: StudentQuery = {}) =>
    api.get<Ok & { students: AdminStudent[] }>('/api/admin/students/', { ...query }),
  /** GET /admin/students/<profile_id>/ */
  student: (profileId: UUID) => api.get<Ok & { student: AdminStudent }>(`/api/admin/students/${profileId}/`),
  /** POST /admin/students/ */
  createStudent: (body: CreateStudentBody) => api.post<Ok & { student: AdminStudent }>('/api/admin/students/', body),
  /** PATCH /admin/students/<profile_id>/ (partial). */
  updateStudent: (profileId: UUID, body: UpdateStudentBody) =>
    api.patch<Ok & { student: AdminStudent }>(`/api/admin/students/${profileId}/`, body),
  /** DELETE /admin/students/<profile_id>/: soft delete (also removes face data). */
  deleteStudent: (profileId: UUID) => api.delete<OkMessage>(`/api/admin/students/${profileId}/`),
  /** POST /admin/students/<profile_id>/restore/ */
  restoreStudent: (profileId: UUID) =>
    api.post<Ok & { message?: string; student?: AdminStudent }>(`/api/admin/students/${profileId}/restore/`),

  /** POST /admin/students/import/ (multipart). Dry run unless `apply` is true. */
  importStudents: async ({ file, apply = false, semesterId }: ImportOptions) => {
    const form = new FormData();
    await appendFile(form, 'file', file);
    form.append('apply', apply ? 'true' : 'false');
    if (semesterId) form.append('semester_id', semesterId);
    return api.post<ImportResult>('/api/admin/students/import/', form, { ...MULTIPART, timeout: 120000 });
  },

  // Teachers
  /** GET /admin/teachers/ */
  teachers: (query: TeacherQuery = {}) =>
    api.get<Ok & { teachers: AdminTeacher[] }>('/api/admin/teachers/', { ...query }),
  /** GET /admin/teachers/<profile_id>/ */
  teacher: (profileId: UUID) => api.get<Ok & { teacher: AdminTeacher }>(`/api/admin/teachers/${profileId}/`),
  /** POST /admin/teachers/ */
  createTeacher: (body: CreateTeacherBody) => api.post<Ok & { teacher: AdminTeacher }>('/api/admin/teachers/', body),
  /** PATCH /admin/teachers/<profile_id>/ (partial). */
  updateTeacher: (profileId: UUID, body: UpdateTeacherBody) =>
    api.patch<Ok & { teacher: AdminTeacher }>(`/api/admin/teachers/${profileId}/`, body),
  /** DELETE /admin/teachers/<profile_id>/: soft delete. */
  deleteTeacher: (profileId: UUID) => api.delete<OkMessage>(`/api/admin/teachers/${profileId}/`),
  /** POST /admin/teachers/<profile_id>/restore/ */
  restoreTeacher: (profileId: UUID) =>
    api.post<Ok & { message?: string; teacher?: AdminTeacher }>(`/api/admin/teachers/${profileId}/restore/`),

  // Semesters
  /** GET /admin/semesters/: active first, then newest session, level, term. */
  semesters: (status?: SemesterStatus) => api.get<Ok & { semesters: Semester[] }>('/api/admin/semesters/', { status }),
  /** GET /admin/semesters/<id>/ (also for a deleted semester). */
  semester: (semesterId: UUID) => api.get<SemesterResponse>(`/api/admin/semesters/${semesterId}/`),
  /** POST /admin/semesters/ (also creates its hidden class group). 400 level_has_active_semester. */
  createSemester: (body: CreateSemesterBody) => api.post<SemesterResponse>('/api/admin/semesters/', body),
  /** PATCH /admin/semesters/<id>/ */
  updateSemester: (semesterId: UUID, body: UpdateSemesterBody) =>
    api.patch<SemesterResponse>(`/api/admin/semesters/${semesterId}/`, body),
  /** DELETE /admin/semesters/<id>/: soft delete. */
  deleteSemester: (semesterId: UUID) => api.delete<OkMessage>(`/api/admin/semesters/${semesterId}/`),
  /** POST /admin/semesters/<id>/finish/ */
  finishSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/finish/`),
  /** POST /admin/semesters/<id>/reopen/ */
  reopenSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/reopen/`),
  /** POST /admin/semesters/<id>/restore/ */
  restoreSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/restore/`),

  /** GET /admin/semesters/<id>/students/ (`includeLeft` adds former members). */
  semesterStudents: (semesterId: UUID, { includeLeft = false } = {}) =>
    api.get<RosterResponse>(`/api/admin/semesters/${semesterId}/students/`, { include_left: includeLeft ? 'true' : undefined }),
  /**
   * POST /admin/semesters/<id>/students/: adds them (joined today once the semester has held a
   * class; before that, from the start). 400 for an unknown id or a deleted account.
   */
  addSemesterStudents: (semesterId: UUID, profileIds: UUID[]) =>
    api.post<AddRosterResponse>(`/api/admin/semesters/${semesterId}/students/`, { profile_ids: profileIds }),
  /** POST /admin/semesters/<id>/students/remove/: marks them left today (history stays). */
  removeSemesterStudents: (semesterId: UUID, profileIds: UUID[]) =>
    api.post<RemoveRosterResponse>(`/api/admin/semesters/${semesterId}/students/remove/`, { profile_ids: profileIds }),

  /** GET /admin/semesters/<id>/courses/ */
  semesterCourses: (semesterId: UUID) => api.get<SemesterCoursesResponse>(`/api/admin/semesters/${semesterId}/courses/`),
  /** POST /admin/semesters/<id>/courses/: teach a course in this semester. */
  addSemesterCourse: (semesterId: UUID, body: { course_id: UUID; teacher_id: UUID | null }) =>
    api.post<Ok & { message?: string; course?: SemesterCourse }>(`/api/admin/semesters/${semesterId}/courses/`, body),
  /** PATCH /admin/course-info/<id>/: reassign the teacher (the new one sees all history). */
  reassignTeacher: (courseInfoId: UUID, teacherId: UUID | null) =>
    api.patch<Ok & { message?: string }>(`/api/admin/course-info/${courseInfoId}/`, { teacher_id: teacherId }),
  /** DELETE /admin/course-info/<id>/: soft delete. */
  deleteCourseInfo: (courseInfoId: UUID) => api.delete<Ok & { message?: string }>(`/api/admin/course-info/${courseInfoId}/`),

  /** POST /admin/semesters/<id>/promote/: moves students on and finishes this semester. */
  promoteSemester: (semesterId: UUID, body: PromoteBody) =>
    api.post<PromoteResponse>(`/api/admin/semesters/${semesterId}/promote/`, body),

  // Courses
  /** GET /admin/courses/ */
  courses: (status?: PersonStatus) => api.get<Ok & { courses: Course[] }>('/api/admin/courses/', { status }),
  /** GET /admin/courses/<id>/ */
  course: (courseId: UUID) => api.get<Ok & { course: Course }>(`/api/admin/courses/${courseId}/`),
  /** POST /admin/courses/ */
  createCourse: (body: CreateCourseBody) => api.post<Ok & { course: Course }>('/api/admin/courses/', body),
  /** PATCH /admin/courses/<id>/ (partial). */
  updateCourse: (courseId: UUID, body: UpdateCourseBody) =>
    api.patch<Ok & { course: Course }>(`/api/admin/courses/${courseId}/`, body),
  /** DELETE /admin/courses/<id>/: soft delete (hidden from teachers and students too). */
  deleteCourse: (courseId: UUID) => api.delete<OkMessage>(`/api/admin/courses/${courseId}/`),
  /** POST /admin/courses/<id>/restore/ */
  restoreCourse: (courseId: UUID) =>
    api.post<Ok & { message?: string; course?: Course }>(`/api/admin/courses/${courseId}/restore/`),

  // Overview and attendance
  /** GET /admin/overview/ */
  overview: () => api.get<Overview>('/api/admin/overview/'),
  /** GET /admin/course-info/: every taught course (optionally one semester's). */
  courseInfos: ({ semesterId }: { semesterId?: UUID } = {}) =>
    api.get<AdminCourseInfosResponse>('/api/admin/course-info/', { semester_id: semesterId }),
};
