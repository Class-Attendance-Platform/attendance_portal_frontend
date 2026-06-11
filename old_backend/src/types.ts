export interface Course {
  id: string;
  deleted: boolean;
  code: string;
  title: string;
  content: string;
  credits: string;
  faculty: string;
  department: string;
}

export interface Teacher {
  id: string;
  deleted: boolean;
  userName: string;
  email: string;
  passwordHash: string;
  role: string;
  faculty: string;
  department: string;
  currentCourses: string[]; 
  previousCourses: string[]; 
}

export interface Student {
  id: string;
  deleted: boolean;
  userName: string;
  email: string;
  passwordHash: string;
  role: string;
  faculty: string;
  department: string;
  currentLevel: string;
  currentSemester: string;
  studentId: number;
  semesterCourses: string[]; 
}

export interface Admin {
  id: string;
  deleted: boolean;
  userName: string;
  email: string;
  passwordHash: string;
  role: string;
  faculty: string;
  department: string;
}

export interface CourseInfo {
  id: string;
  deleted: boolean;
  course: string; 
  teacher: string; 
  attendance: string; 
}

export interface HistorySession {
  date: string;
  presentStudents: number[];
}

export interface Attendance {
  id: string;
  deleted: boolean;
  totalClasses: number;
  attendanceMap: Record<number, number>; 
  history: HistorySession[];
}

export interface SemesterCourse {
  id: string;
  deleted: boolean;
  level: string;
  semester: string;
  startDate: [number, number, number] | null; 
  endDate: [number, number, number] | null; 
  students: string[]; 
  courses: string[]; 
}

export interface DB {
  courses: Course[];
  teachers: Teacher[];
  students: Student[];
  admins: Admin[];
  courseInfos: CourseInfo[];
  attendances: Attendance[];
  semesterCourses: SemesterCourse[];
}
