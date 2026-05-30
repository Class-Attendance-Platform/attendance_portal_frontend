import express, { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveCourseInfo, recalculateAttendance } from '../queries';
import { activeSessions, getSession, finalizeSession } from '../sessionManager';
import { exportAttendanceReport } from '../reports';

export const teacherRouter = express.Router();

teacherRouter.get('/:id/courses', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const teacher = await prisma.teacher.findUnique({
    where: { id }
  });

  if (!teacher || teacher.deleted) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const courseInfos = await prisma.courseInfo.findMany({
    where: { teacherId: id, deleted: false },
    include: {
      course: true,
      attendance: true,
      semesters: {
        include: {
          semester: true
        }
      }
    }
  });

  const currentCourses = [];
  const previousCourses = [];

  for (const ci of courseInfos) {
    const isCurrent = ci.semesters.some(s => s.semester.level === 'Third' && s.semester.semester === 'I' && !s.semester.deleted);
    const resolvedItem = {
      id: ci.id,
      course: {
        id: ci.course.id,
        code: ci.course.code,
        title: ci.course.title,
        content: ci.course.content,
        credits: ci.course.credits,
        faculty: ci.course.faculty,
        department: ci.course.department
      },
      totalClasses: ci.attendance.totalClasses
    };

    if (isCurrent) {
      currentCourses.push(resolvedItem);
    } else {
      previousCourses.push(resolvedItem);
    }
  }

  res.json({
    success: true,
    currentCourses,
    previousCourses
  });
});

teacherRouter.get('/course-info/:id', async (req: Request, res: Response) => {
  const resolved = await resolveCourseInfo(req.params.id as string);
  if (!resolved) {
    return res.status(404).json({ success: false, message: "Course info not found." });
  }
  res.json({ success: true, courseInfo: resolved });
});

teacherRouter.post('/course-info/:id/update-classes', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { delta } = req.body;

  const ci = await prisma.courseInfo.findFirst({
    where: { id, deleted: false }
  });
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = await prisma.attendance.findFirst({
    where: { id: ci.attendanceId, deleted: false }
  });
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  const newTotal = (attendance.totalClasses || 0) + parseInt(delta, 10);
  if (newTotal >= 0) {
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { totalClasses: newTotal }
    });
    return res.json({ success: true, totalClasses: newTotal });
  }
  res.status(400).json({ success: false, message: "Total classes cannot be negative." });
});

teacherRouter.post('/course-info/:id/mark', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { studentId, delta } = req.body;

  const ci = await prisma.courseInfo.findFirst({
    where: { id, deleted: false }
  });
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = await prisma.attendance.findFirst({
    where: { id: ci.attendanceId, deleted: false }
  });
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  const attMap = JSON.parse(attendance.attendanceMap || '{}');
  const currentCount = attMap[studentId] || 0;
  const newCount = currentCount + parseInt(delta, 10);

  if (newCount < 0) {
    return res.status(400).json({ success: false, message: "Attendance cannot be negative." });
  }
  if (parseInt(delta, 10) > 0 && currentCount >= attendance.totalClasses) {
    return res.status(400).json({ success: false, message: "Attendance count cannot exceed total classes conducted." });
  }

  attMap[studentId] = newCount;
  await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      attendanceMap: JSON.stringify(attMap)
    }
  });

  res.json({ success: true, attendanceMap: attMap });
});

teacherRouter.post('/course-info/:id/history-session', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { date, presentStudentIds } = req.body;
  if (!date || !Array.isArray(presentStudentIds)) {
    return res.status(400).json({ success: false, message: "Date and presentStudentIds array are required." });
  }

  const ci = await prisma.courseInfo.findFirst({
    where: { id, deleted: false }
  });
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = await prisma.attendance.findFirst({
    where: { id: ci.attendanceId, deleted: false }
  });
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  const history = JSON.parse(attendance.history || '[]');
  const existingIndex = history.findIndex((h: any) => h.date === date);
  const formattedPresentStudentIds = presentStudentIds.map(sid => parseInt(sid, 10));

  if (existingIndex >= 0) {
    history[existingIndex].presentStudents = formattedPresentStudentIds;
  } else {
    history.push({
      date,
      presentStudents: formattedPresentStudentIds
    });
  }

  history.sort((a: any, b: any) => a.date.localeCompare(b.date));

  await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      history: JSON.stringify(history)
    }
  });

  await recalculateAttendance(attendance.id);

  const updatedAttendance = await prisma.attendance.findUnique({
    where: { id: attendance.id }
  });

  res.json({
    success: true,
    attendance: {
      id: updatedAttendance?.id,
      deleted: updatedAttendance?.deleted,
      totalClasses: updatedAttendance?.totalClasses,
      attendanceMap: JSON.parse(updatedAttendance?.attendanceMap || '{}'),
      history: JSON.parse(updatedAttendance?.history || '[]')
    }
  });
});

teacherRouter.delete('/course-info/:id/history-session/:date', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const date = req.params.date as string;

  const ci = await prisma.courseInfo.findFirst({
    where: { id, deleted: false }
  });
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = await prisma.attendance.findFirst({
    where: { id: ci.attendanceId, deleted: false }
  });
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  let history = JSON.parse(attendance.history || '[]');
  history = history.filter((h: any) => h.date !== date);

  await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      history: JSON.stringify(history)
    }
  });

  await recalculateAttendance(attendance.id);

  const updatedAttendance = await prisma.attendance.findUnique({
    where: { id: attendance.id }
  });

  res.json({
    success: true,
    attendance: {
      id: updatedAttendance?.id,
      deleted: updatedAttendance?.deleted,
      totalClasses: updatedAttendance?.totalClasses,
      attendanceMap: JSON.parse(updatedAttendance?.attendanceMap || '{}'),
      history: JSON.parse(updatedAttendance?.history || '[]')
    }
  });
});

teacherRouter.post('/course-info/:id/session/start', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { duration } = req.body;
  
  if (activeSessions.has(id)) {
    const s = getSession(id);
    if (s) {
      return res.json({ success: true, session: { courseInfoId: s.courseInfoId, endTime: s.endTime, timeLeft: Math.max(0, s.endTime - Date.now()) } });
    }
  }

  const endTime = Date.now() + (parseInt(duration, 10) || 300000);
  const session = {
    courseInfoId: id,
    endTime,
    submittedStudents: new Set<string>()
  };
  activeSessions.set(id, session);
  console.log(`Started attendance session for CourseInfo ${id} expiring at ${new Date(endTime).toISOString()}`);

  res.json({
    success: true,
    session: {
      courseInfoId: id,
      endTime,
      timeLeft: endTime - Date.now()
    }
  });
});

teacherRouter.post('/course-info/:id/session/stop', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!activeSessions.has(id)) {
    return res.status(400).json({ success: false, message: "No active session for this course." });
  }
  await finalizeSession(id);
  res.json({ success: true, message: "Session stopped and attendance applied." });
});

teacherRouter.get('/course-info/:id/session/status', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const session = getSession(id);

  if (!session) {
    return res.json({ success: true, active: false });
  }

  const submittedList = [];
  for (const studentIdStr of Array.from(session.submittedStudents)) {
    const studentId = parseInt(studentIdStr, 10);
    const student = await prisma.student.findFirst({
      where: { studentId, deleted: false }
    });
    submittedList.push({
      studentId,
      userName: student ? student.userName : "Unknown Student"
    });
  }

  res.json({
    success: true,
    active: true,
    session: {
      courseInfoId: id,
      endTime: session.endTime,
      timeLeft: Math.max(0, session.endTime - Date.now()),
      submissions: submittedList
    }
  });
});

teacherRouter.get('/course-info/:id/export', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const format = (req.query.format as string || 'pdf').toLowerCase();
  const date = req.query.date as string | undefined;
  
  exportAttendanceReport(res, id, format, date);
});
