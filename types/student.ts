import type { BaseUser } from "./user";
import type { Level, SemesterName } from "./common";

export interface Student extends BaseUser {
  role: 'STUDENT';
  studentId: number;
  currentLevel: Level;
  currentSemester: SemesterName;
  semesterCourses?: string[];
  batchYear?: number;
}

export interface StudentRow {
  id: string;
  userName: string;
  studentId?: number;
  student_id?: number;
  email: string;
  currentLevel: Level;
  currentSemester: SemesterName;
  attendanceCount: number;
  percentage: number;
}
