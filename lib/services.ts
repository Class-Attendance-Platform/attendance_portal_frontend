import { api, API_BASE, getAccessToken } from './api';

export const authService = {
  login: (email: string, password: string) => api.post('/api/auth/login/', { email, password }),

  register: (payload: any) => api.post('/api/auth/register/', payload),

  getMe: () => api.get('/api/auth/me/'),
};

export const configService = {
  getCredits: () => api.get('/api/config/credits/'),
  getFaculties: () => api.get('/api/config/faculties/'),
  getDepartments: () => api.get('/api/config/departments/'),
};

export const adminService = {
  getCourses: () => api.get('/api/admin/courses/'),
  createCourse: (body: any) => api.post('/api/admin/courses/', body),
  updateCourse: (id: string, body: any) => api.put(`/api/admin/courses/${id}/`, body),
  deleteCourse: (id: string) => api.delete(`/api/admin/courses/${id}/`),

  getSemesters: () => api.get('/api/admin/semesters/'),
  createSemester: (body: any) => api.post('/api/admin/semesters/', body),
  updateSemester: (id: string, body: any) => api.put(`/api/admin/semesters/${id}/`, body),
  deleteSemester: (id: string) => api.delete(`/api/admin/semesters/${id}/`),

  getClassrooms: () => api.get('/api/admin/classrooms/'),
  createClassroom: (body: any) => api.post('/api/admin/classrooms/', body),
  updateClassroom: (id: string, body: any) => api.put(`/api/admin/classrooms/${id}/`, body),
  deleteClassroom: (id: string) => api.delete(`/api/admin/classrooms/${id}/`),
  getClassroomStudents: (id: string) => api.get(`/api/admin/classrooms/${id}/students/`),
  addClassroomStudents: (id: string, studentIds: string[]) =>
    api.post(`/api/admin/classrooms/${id}/students/`, { student_ids: studentIds }),
  removeClassroomStudents: (id: string, studentIds: string[]) =>
    api.delete(`/api/admin/classrooms/${id}/students/`, { data: { student_ids: studentIds } }),

  getCourseInfos: () => api.get('/api/admin/course-info/'),
  createCourseInfo: (body: any) => api.post('/api/admin/course-info/', body),
  updateCourseInfo: (id: string, body: any) => api.put(`/api/admin/course-info/${id}/`, body),
  deleteCourseInfo: (id: string) => api.delete(`/api/admin/course-info/${id}/`),

  getStudents: () => api.get('/api/admin/students/'),
  createStudent: (body: any) => api.post('/api/admin/students/', body),
  updateStudent: (id: string, body: any) => api.put(`/api/admin/students/${id}/`, body),
  deleteStudent: (id: string) => api.delete(`/api/admin/students/${id}/`),

  getTeachers: () => api.get('/api/admin/teachers/'),
  createTeacher: (body: any) => api.post('/api/admin/teachers/', body),
  updateTeacher: (id: string, body: any) => api.put(`/api/admin/teachers/${id}/`, body),
  deleteTeacher: (id: string) => api.delete(`/api/admin/teachers/${id}/`),
};

export const studentService = {
  getSemesters: (studentUuid: string) => api.get(`/api/student/${studentUuid}/semesters/`),
};

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

  getActiveSession: (courseInfoId: string) =>
    api.get(`/api/sessions/course-info/${courseInfoId}/active/`),

  submitAttendance: async (
    sessionId: string,
    studentId: number,
    qrToken: string,
    macAddress: string
  ) => {
    try {
      const response = await api.post(`/api/sessions/${sessionId}/checkin/`, {
        student_id: studentId,
        mac_address: macAddress,
        qr_token: qrToken,
      });
      return response;
    } catch (err: any) {
      const isAlreadySubmitted = err.message?.toLowerCase().includes('already submitted') || 
                                 err.message?.toLowerCase().includes('already registered');
      if (isAlreadySubmitted) {
        return { success: true, message: err.message };
      }
      throw err;
    }
  },
};

export const reportService = {
  getExportUrl: (courseInfoId: string, format: string, date?: string | null) => {
    let url = `${API_BASE}/api/reports/course-info/${courseInfoId}/export/?export_format=${format}`;
    if (date) {
      url += `&date=${date}`;
    }
    return url;
  },

  downloadExport: async (courseInfoId: string, format: string, date?: string | null) => {
    const accessToken = getAccessToken();
    const response = await fetch(reportService.getExportUrl(courseInfoId, format, date), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Failed to export ${format.toUpperCase()} report.`);
    }

    return response;
  },
};
