export interface AttendanceHistoryItem {
  date: string;
  presentStudents: number[];
}

export interface Attendance {
  id: string;
  totalClasses: number;
  attendanceMap: Record<number, number>;
  history?: AttendanceHistoryItem[];
}

export interface CourseStat {
  id: string;
  course: {
    title: string;
    code: string;
    credits: string;
  };
  teacher: {
    userName: string;
    email: string;
  };
  totalClasses: number;
  presentCount: number;
  percentage: number;
  history?: Array<{ date: string; present: boolean }>;
}
