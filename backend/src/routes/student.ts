import express, { Request, Response } from 'express';
import { prisma } from '../db';

export const studentRouter = express.Router();

studentRouter.get('/:id/semesters', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const student = await prisma.student.findFirst({
    where: { id, deleted: false },
    include: {
      semesters: {
        include: {
          semester: {
            include: {
              courses: {
                include: {
                  courseInfo: {
                    include: {
                      course: true,
                      teacher: true,
                      attendance: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const semestersResolved = student.semesters.map(ss => {
    const sc = ss.semester;
    if (!sc || sc.deleted) return null;

    const coursesResolved = sc.courses.map(sci => {
      const ci = sci.courseInfo;
      if (!ci || ci.deleted) return null;

      const course = ci.course;
      const teacher = ci.teacher;
      const attMap = JSON.parse(ci.attendance.attendanceMap || '{}');
      const history = JSON.parse(ci.attendance.history || '[]');

      const studentAttendanceCount = attMap[student.studentId] || 0;
      const rate = ci.attendance.totalClasses > 0 ? (studentAttendanceCount / ci.attendance.totalClasses) * 100 : 0;

      const historyResolved = history.map((h: any) => ({
        date: h.date,
        present: h.presentStudents.includes(student.studentId)
      }));

      return {
        id: ci.id,
        course: {
          id: course.id,
          code: course.code,
          title: course.title,
          content: course.content,
          credits: course.credits,
          faculty: course.faculty,
          department: course.department
        },
        teacher: { userName: teacher.userName, email: teacher.email },
        totalClasses: ci.attendance.totalClasses,
        presentCount: studentAttendanceCount,
        percentage: parseFloat(rate.toFixed(2)),
        history: historyResolved
      };
    }).filter(Boolean);

    return {
      id: sc.id,
      level: sc.level,
      semester: sc.semester,
      startDate: sc.startDate ? JSON.parse(sc.startDate) : null,
      endDate: sc.endDate ? JSON.parse(sc.endDate) : null,
      courses: coursesResolved
    };
  }).filter(Boolean);

  res.json({ success: true, semesters: semestersResolved });
});
