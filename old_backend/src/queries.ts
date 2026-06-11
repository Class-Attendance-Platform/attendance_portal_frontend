import { prisma } from './db';
import { HistorySession } from './types';

export async function recalculateAttendance(attendanceId: string): Promise<void> {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId }
  });
  if (!attendance) return;

  const history = JSON.parse(attendance.history || '[]') as HistorySession[];
  const totalClasses = history.length;
  const attendanceMap: Record<number, number> = {};

  history.forEach((h: any) => {
    (h.presentStudents || []).forEach((studentId: number) => {
      attendanceMap[studentId] = (attendanceMap[studentId] || 0) + 1;
    });
  });

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      totalClasses,
      attendanceMap: JSON.stringify(attendanceMap)
    }
  });
}

export async function resolveCourseInfo(ciId: string) {
  const ci = await prisma.courseInfo.findFirst({
    where: { id: ciId, deleted: false },
    include: {
      course: true,
      teacher: true,
      attendance: true
    }
  });
  if (!ci) return null;

  const semesterRelation = await prisma.semesterCourseInfo.findFirst({
    where: { courseInfoId: ciId, semester: { deleted: false } },
    include: {
      semester: {
        include: {
          students: {
            include: {
              student: true
            }
          }
        }
      }
    }
  });

  const students = semesterRelation?.semester.students
    .filter(s => !s.student.deleted)
    .map(s => ({
      id: s.student.id,
      userName: s.student.userName,
      studentId: s.student.studentId,
      email: s.student.email,
      currentLevel: s.student.currentLevel,
      currentSemester: s.student.currentSemester
    })) || [];

  return {
    id: ci.id,
    course: ci.course,
    teacher: { id: ci.teacher.id, userName: ci.teacher.userName, email: ci.teacher.email },
    attendance: {
      id: ci.attendance.id,
      deleted: ci.attendance.deleted,
      totalClasses: ci.attendance.totalClasses,
      attendanceMap: JSON.parse(ci.attendance.attendanceMap || '{}'),
      history: JSON.parse(ci.attendance.history || '[]') as HistorySession[]
    },
    students
  };
}
