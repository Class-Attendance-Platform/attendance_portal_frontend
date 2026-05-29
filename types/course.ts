import type { Attendance } from "./attendance";
import type { StudentRow } from "./student";

export interface Course {
  id: string;
  code: string;
  title: string;
  content?: string;
  credits: string;
  faculty: string;
  department: string;
  level?: string;
}

export interface CourseInfo {
  id: string;
  course: Course;
  teacher: {
    id?: string;
    userName: string;
    email?: string;
  };
  attendance: Attendance;
  students: StudentRow[];
}

export interface TeacherCourseListItem {
  id: string;
  course: {
    title: string;
    code: string;
  };
  totalClasses: number;
}