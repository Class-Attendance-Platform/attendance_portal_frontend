import { api, API_BASE } from './api';

// ── Auth Service ─────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) => api.post('/api/auth/login/', { email, password }),

  register: (payload: any) => api.post('/api/auth/register/', payload),

  getMe: () => api.get('/api/auth/me/'),
};

// ── Config Service ───────────────────────────────────────────────────────────
export const configService = {
  getCredits: () => api.get('/api/config/credits/'),
  getFaculties: () => api.get('/api/config/faculties/'),
  getDepartments: () => api.get('/api/config/departments/'),
};

// ── Admin Service ────────────────────────────────────────────────────────────
export const adminService = {
  // Courses
  getCourses: () => api.get('/api/admin/courses/'),
  createCourse: (body: any) => api.post('/api/admin/courses/', body),
  updateCourse: (id: string, body: any) => api.put(`/api/admin/courses/${id}/`, body),
  deleteCourse: (id: string) => api.delete(`/api/admin/courses/${id}/`),

  // Semesters
  getSemesters: () => api.get('/api/admin/semesters/'),
  createSemester: (body: any) => api.post('/api/admin/semesters/', body),
  updateSemester: (id: string, body: any) => api.put(`/api/admin/semesters/${id}/`, body),
  deleteSemester: (id: string) => api.delete(`/api/admin/semesters/${id}/`),

  // Students
  getStudents: () => api.get('/api/admin/students/'),
  createStudent: (body: any) => api.post('/api/admin/students/', body),
  updateStudent: (id: string, body: any) => api.put(`/api/admin/students/${id}/`, body),
  deleteStudent: (id: string) => api.delete(`/api/admin/students/${id}/`),

  // Teachers
  getTeachers: () => api.get('/api/admin/teachers/'),
  createTeacher: (body: any) => api.post('/api/admin/teachers/', body),
  updateTeacher: (id: string, body: any) => api.put(`/api/admin/teachers/${id}/`, body),
  deleteTeacher: (id: string) => api.delete(`/api/admin/teachers/${id}/`),
};

// ── Student Service ──────────────────────────────────────────────────────────
export const studentService = {
  getSemesters: (studentUuid: string) => api.get(`/api/student/${studentUuid}/semesters/`),
};

// ── Teacher Service ──────────────────────────────────────────────────────────
export const teacherService = {
  getTeacherCourses: (teacherUuid: string) => api.get(`/api/teacher/${teacherUuid}/courses/`),

  getCourseDetails: (courseInfoUuid: string) =>
    api.get(`/api/teacher/course-info/${courseInfoUuid}/`),

  saveHistorySession: (courseInfoUuid: string, date: string, presentStudentIds: number[]) =>
    api.post(`/api/teacher/course-info/${courseInfoUuid}/history-session/`, {
      date,
      presentStudentIds,
    }),

  deleteHistorySession: (courseInfoUuid: string, date: string) =>
    api.delete(`/api/teacher/course-info/${courseInfoUuid}/history-session/${date}/`),
};

// ── Session Service ──────────────────────────────────────────────────────────
export const sessionService = {
  startSession: (courseInfoId: string, durationSeconds: number) =>
    api.post('/api/sessions/start/', {
      course_info_id: courseInfoId,
      mode: 'QR_ONLINE',
      duration_seconds: durationSeconds,
    }),

  stopSession: (sessionId: string) => api.post(`/api/sessions/${sessionId}/stop/`),

  getSessionStatus: (sessionId: string) => api.get(`/api/sessions/${sessionId}/status/`),

  getCourseHistory: (courseInfoId: string) =>
    api.get(`/api/sessions/course-info/${courseInfoId}/history/`),
};

// ── Report Service ───────────────────────────────────────────────────────────
export const reportService = {
  getExportUrl: (courseInfoId: string, format: string, date?: string | null) => {
    let url = `${API_BASE}/api/reports/course-info/${courseInfoId}/export/?export_format=${format}`;
    if (date) {
      url += `&date=${date}`;
    }
    return url;
  },
};
