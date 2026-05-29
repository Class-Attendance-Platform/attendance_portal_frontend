import type { BaseUser } from "./user";

export interface Student extends BaseUser {
  role: 'STUDENT';
  studentId: number;
  currentLevel: string;
  currentSemester: string;
  semesterCourses?: string[];
  batchYear?: number;
}

export interface StudentRow {
  id: string;
  userName: string;
  studentId: number;
  email: string;
  currentLevel: string;
  currentSemester: string;
  attendanceCount: number;
  percentage: number;
}