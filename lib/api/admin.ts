import { appendFile, type UploadFile } from '../upload';
import { api, MULTIPART, type ApiError } from './client';
import type { Delivery, ISODate, ISODateTime, Level, Ok, OkMessage, PersonRef, Role, Term, UUID } from './types';

export const ADMIN_ERRORS = {
  levelHasActiveSemester: 'level_has_active_semester',
  alreadyInSemester: 'already_in_semester',
  alreadyApproved: 'already_approved',
} as const;

export interface SemesterClash {
  profile_id: UUID;
  student_id: number;
  name: string;
  semester_id: UUID;
  semester_label: string;
}

export function semesterClashes(error: ApiError | null): SemesterClash[] {
  if (error?.code !== ADMIN_ERRORS.alreadyInSemester) return [];
  const students = error.body.students;
  return Array.isArray(students) ? (students as SemesterClash[]) : [];
}

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

export interface AutoApprovalSettings {
  admin: boolean;
  teacher: boolean;
  student: boolean;
}

export interface AutoApprovalResponse extends Ok {
  settings: AutoApprovalSettings;
}

export interface PendingUsersResponse extends Ok {
  users: PendingUser[];
}

export type PersonStatus = 'active' | 'deleted';

export interface AdminStudent {
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
  semester: { id: UUID; label: string } | null;
}

export interface StudentQuery {
  search?: string;
  level?: Level;
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
  password: string;
}

export type UpdateStudentBody = Partial<Omit<CreateStudentBody, 'password'>>;

export interface AdminTeacher {
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

export type ImportRowStatus = 'create' | 'exists' | 'error';

export interface ImportRow {
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
  created: { student_id: number; email: string; temporary_password: string }[];
}

export interface ImportOptions {
  file: UploadFile;
  apply?: boolean;
  semesterId?: UUID;
}

export interface Semester {
  id: UUID;
  level: Level;
  semester: Term;
  session: string;
  label: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  is_active: boolean;
  deleted: boolean;
  classroom_id: UUID;
  student_count: number;
  course_count: number;
}

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
  students: RosterMember[];
}

export interface AddRosterResponse extends OkMessage {
  added: number;
  rejoined: number;
  already_in: number;
}

export interface RemoveRosterResponse extends OkMessage {
  removed: number;
}

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
  target: CreateSemesterBody | null;
  target_semester_id?: UUID;
  profile_ids?: UUID[];
}

export interface PromoteResponse extends Ok {
  target_semester_id: UUID;
  moved: number;
}

export interface Course {
  id: UUID;
  code: string;
  title: string;
  content: string;
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
  semester: { id: UUID; label: string; is_active: boolean; start_date: ISODate | null; end_date: ISODate | null };
  student_count: number;
  classes_held: number;
  average_percent: number | null;
}

export interface AdminCourseInfosResponse extends Ok {
  course_infos: AdminCourseInfo[];
}

export const adminApi = {
  autoApprovalSettings: () => api.get<AutoApprovalResponse>('/api/admin/auto-approval/'),
  updateAutoApprovalSettings: (settings: Partial<AutoApprovalSettings>) =>
    api.patch<AutoApprovalResponse>('/api/admin/auto-approval/', settings),
  pendingUsers: () => api.get<PendingUsersResponse>('/api/admin/users/pending/'),
  approveUser: (userId: UUID) => api.post<OkMessage>(`/api/admin/users/${userId}/verify/`),
  rejectUser: (userId: UUID) => api.post<Ok & { message?: string }>(`/api/admin/users/${userId}/reject/`),
  resetPassword: (userId: UUID, newPassword: string) =>
    api.post<OkMessage>(`/api/admin/users/${userId}/reset-password/`, { new_password: newPassword }),

  students: (query: StudentQuery = {}) =>
    api.get<Ok & { students: AdminStudent[] }>('/api/admin/students/', { ...query }),
  student: (profileId: UUID) => api.get<Ok & { student: AdminStudent }>(`/api/admin/students/${profileId}/`),
  createStudent: (body: CreateStudentBody) => api.post<Ok & { student: AdminStudent }>('/api/admin/students/', body),
  updateStudent: (profileId: UUID, body: UpdateStudentBody) =>
    api.patch<Ok & { student: AdminStudent }>(`/api/admin/students/${profileId}/`, body),
  deleteStudent: (profileId: UUID) => api.delete<OkMessage>(`/api/admin/students/${profileId}/`),
  restoreStudent: (profileId: UUID) =>
    api.post<Ok & { message?: string; student?: AdminStudent }>(`/api/admin/students/${profileId}/restore/`),

  importStudents: async ({ file, apply = false, semesterId }: ImportOptions) => {
    const form = new FormData();
    await appendFile(form, 'file', file);
    form.append('apply', apply ? 'true' : 'false');
    if (semesterId) form.append('semester_id', semesterId);
    return api.post<ImportResult>('/api/admin/students/import/', form, { ...MULTIPART, timeout: 120000 });
  },

  teachers: (query: TeacherQuery = {}) =>
    api.get<Ok & { teachers: AdminTeacher[] }>('/api/admin/teachers/', { ...query }),
  teacher: (profileId: UUID) => api.get<Ok & { teacher: AdminTeacher }>(`/api/admin/teachers/${profileId}/`),
  createTeacher: (body: CreateTeacherBody) => api.post<Ok & { teacher: AdminTeacher }>('/api/admin/teachers/', body),
  updateTeacher: (profileId: UUID, body: UpdateTeacherBody) =>
    api.patch<Ok & { teacher: AdminTeacher }>(`/api/admin/teachers/${profileId}/`, body),
  deleteTeacher: (profileId: UUID) => api.delete<OkMessage>(`/api/admin/teachers/${profileId}/`),
  restoreTeacher: (profileId: UUID) =>
    api.post<Ok & { message?: string; teacher?: AdminTeacher }>(`/api/admin/teachers/${profileId}/restore/`),

  semesters: (status?: SemesterStatus) => api.get<Ok & { semesters: Semester[] }>('/api/admin/semesters/', { status }),
  semester: (semesterId: UUID) => api.get<SemesterResponse>(`/api/admin/semesters/${semesterId}/`),
  createSemester: (body: CreateSemesterBody) => api.post<SemesterResponse>('/api/admin/semesters/', body),
  updateSemester: (semesterId: UUID, body: UpdateSemesterBody) =>
    api.patch<SemesterResponse>(`/api/admin/semesters/${semesterId}/`, body),
  deleteSemester: (semesterId: UUID) => api.delete<OkMessage>(`/api/admin/semesters/${semesterId}/`),
  finishSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/finish/`),
  reopenSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/reopen/`),
  restoreSemester: (semesterId: UUID) =>
    api.post<Ok & { message?: string; semester?: Semester }>(`/api/admin/semesters/${semesterId}/restore/`),

  semesterStudents: (semesterId: UUID, { includeLeft = false } = {}) =>
    api.get<RosterResponse>(`/api/admin/semesters/${semesterId}/students/`, { include_left: includeLeft ? 'true' : undefined }),
  addSemesterStudents: (semesterId: UUID, profileIds: UUID[]) =>
    api.post<AddRosterResponse>(`/api/admin/semesters/${semesterId}/students/`, { profile_ids: profileIds }),
  removeSemesterStudents: (semesterId: UUID, profileIds: UUID[]) =>
    api.post<RemoveRosterResponse>(`/api/admin/semesters/${semesterId}/students/remove/`, { profile_ids: profileIds }),

  semesterCourses: (semesterId: UUID) => api.get<SemesterCoursesResponse>(`/api/admin/semesters/${semesterId}/courses/`),
  addSemesterCourse: (semesterId: UUID, body: { course_id: UUID; teacher_id: UUID | null }) =>
    api.post<Ok & { message?: string; course?: SemesterCourse }>(`/api/admin/semesters/${semesterId}/courses/`, body),
  reassignTeacher: (courseInfoId: UUID, teacherId: UUID | null) =>
    api.patch<Ok & { message?: string }>(`/api/admin/course-info/${courseInfoId}/`, { teacher_id: teacherId }),
  deleteCourseInfo: (courseInfoId: UUID) => api.delete<Ok & { message?: string }>(`/api/admin/course-info/${courseInfoId}/`),

  promoteSemester: (semesterId: UUID, body: PromoteBody) =>
    api.post<PromoteResponse>(`/api/admin/semesters/${semesterId}/promote/`, body),

  courses: (status?: PersonStatus) => api.get<Ok & { courses: Course[] }>('/api/admin/courses/', { status }),
  course: (courseId: UUID) => api.get<Ok & { course: Course }>(`/api/admin/courses/${courseId}/`),
  createCourse: (body: CreateCourseBody) => api.post<Ok & { course: Course }>('/api/admin/courses/', body),
  updateCourse: (courseId: UUID, body: UpdateCourseBody) =>
    api.patch<Ok & { course: Course }>(`/api/admin/courses/${courseId}/`, body),
  deleteCourse: (courseId: UUID) => api.delete<OkMessage>(`/api/admin/courses/${courseId}/`),
  restoreCourse: (courseId: UUID) =>
    api.post<Ok & { message?: string; course?: Course }>(`/api/admin/courses/${courseId}/restore/`),

  overview: () => api.get<Overview>('/api/admin/overview/'),
  courseInfos: ({ semesterId }: { semesterId?: UUID } = {}) =>
    api.get<AdminCourseInfosResponse>('/api/admin/course-info/', { semester_id: semesterId }),
};
