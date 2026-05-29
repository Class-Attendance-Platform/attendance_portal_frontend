import type { CourseStat } from "./attendance";
import type { Level, SemesterName, DateArray } from "./common";

export interface Semester {
  id: string;
  level: Level;
  semester: SemesterName;
  startDate: DateArray | string;
  endDate: DateArray | string;
  students: string[];
  courses: string[];
}

export interface SemesterData {
  id: string;
  level: Level;
  semester: SemesterName;
  startDate: DateArray | string;
  endDate: DateArray | string;
  courses: CourseStat[];
}
