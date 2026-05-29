import type { CourseStat } from "./attendance";

export interface Semester {
  id: string;
  level: string;
  semester: string;
  startDate: any;
  endDate: any;
  students: string[];
  courses: string[];
}

export interface SemesterData {
  id: string;
  level: string;
  semester: string;
  startDate: any;
  endDate: any;
  courses: CourseStat[];
}
