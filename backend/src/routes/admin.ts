import express, { Request, Response } from 'express';
import { prisma } from '../db';
import * as auth from '../auth';

export const adminRouter = express.Router();

adminRouter.get('/courses', async (req: Request, res: Response) => {
  const list = await prisma.course.findMany({ where: { deleted: false } });
  res.json({ success: true, courses: list });
});

adminRouter.post('/courses', async (req: Request, res: Response) => {
  const { code, title, content, credits, faculty, department } = req.body;
  const newCourse = await prisma.course.create({
    data: {
      code: code || '',
      title: title || '',
      content: content || '',
      credits: credits || 'CREDIT_2_00',
      faculty: faculty || 'COMPUTER_SCIENCE_AND_ENGINEERING',
      department: department || 'COMPUTER_SCIENCE_AND_ENGINEERING'
    }
  });
  res.json({ success: true, course: newCourse });
});

adminRouter.put('/courses/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { code, title, content, credits, faculty, department } = req.body;
  const c = await prisma.course.findFirst({
    where: { id, deleted: false }
  });
  if (c) {
    const updated = await prisma.course.update({
      where: { id: c.id },
      data: {
        code: code !== undefined ? code : c.code,
        title: title !== undefined ? title : c.title,
        content: content !== undefined ? content : c.content,
        credits: credits !== undefined ? credits : c.credits,
        faculty: faculty !== undefined ? faculty : c.faculty,
        department: department !== undefined ? department : c.department
      }
    });
    return res.json({ success: true, course: updated });
  }
  res.status(404).json({ success: false, message: "Course not found." });
});

adminRouter.delete('/courses/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const c = await prisma.course.findUnique({
    where: { id }
  });
  if (c) {
    await prisma.course.update({
      where: { id: c.id },
      data: { deleted: true }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Course not found." });
});

adminRouter.get('/students', async (req: Request, res: Response) => {
  const list = await prisma.student.findMany({ where: { deleted: false } });
  res.json({ success: true, students: list });
});

adminRouter.post('/students', async (req: Request, res: Response) => {
  const { userName, email, studentId, faculty, department, currentLevel, currentSemester, password } = req.body;
  const result = await auth.registerUser({
    userName,
    email,
    password: password || "123456",
    role: "student",
    faculty: faculty || "COMPUTER_SCIENCE_AND_ENGINEERING",
    department: department || "COMPUTER_SCIENCE_AND_ENGINEERING",
    currentLevel: currentLevel || "First",
    currentSemester: currentSemester || "I",
    studentId: studentId
  });
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

adminRouter.put('/students/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { userName, email, studentId, faculty, department, currentLevel, currentSemester, password } = req.body;
  const s = await prisma.student.findFirst({
    where: { id, deleted: false }
  });
  if (s) {
    const dataToUpdate: any = {};
    if (userName !== undefined) dataToUpdate.userName = userName;
    if (email !== undefined) dataToUpdate.email = email;
    if (studentId !== undefined) dataToUpdate.studentId = parseInt(studentId, 10) || s.studentId;
    if (faculty !== undefined) dataToUpdate.faculty = faculty;
    if (department !== undefined) dataToUpdate.department = department;
    if (currentLevel !== undefined) dataToUpdate.currentLevel = currentLevel;
    if (currentSemester !== undefined) dataToUpdate.currentSemester = currentSemester;
    if (password) {
      dataToUpdate.passwordHash = auth.encryptPassword(password);
    }
    const updated = await prisma.student.update({
      where: { id: s.id },
      data: dataToUpdate
    });
    return res.json({ success: true, student: updated });
  }
  res.status(404).json({ success: false, message: "Student not found." });
});

adminRouter.delete('/students/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const s = await prisma.student.findUnique({
    where: { id }
  });
  if (s) {
    await prisma.student.update({
      where: { id: s.id },
      data: { deleted: true }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Student not found." });
});

adminRouter.get('/teachers', async (req: Request, res: Response) => {
  const list = await prisma.teacher.findMany({ where: { deleted: false } });
  res.json({ success: true, teachers: list });
});

adminRouter.post('/teachers', async (req: Request, res: Response) => {
  const { userName, email, faculty, department, password } = req.body;
  const result = await auth.registerUser({
    userName,
    email,
    password: password || "123456",
    role: "teacher",
    faculty: faculty || "COMPUTER_SCIENCE_AND_ENGINEERING",
    department: department || "COMPUTER_SCIENCE_AND_ENGINEERING"
  });
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

adminRouter.put('/teachers/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { userName, email, faculty, department, password } = req.body;
  const t = await prisma.teacher.findFirst({
    where: { id, deleted: false }
  });
  if (t) {
    const dataToUpdate: any = {};
    if (userName !== undefined) dataToUpdate.userName = userName;
    if (email !== undefined) dataToUpdate.email = email;
    if (faculty !== undefined) dataToUpdate.faculty = faculty;
    if (department !== undefined) dataToUpdate.department = department;
    if (password) {
      dataToUpdate.passwordHash = auth.encryptPassword(password);
    }
    const updated = await prisma.teacher.update({
      where: { id: t.id },
      data: dataToUpdate
    });
    return res.json({ success: true, teacher: updated });
  }
  res.status(404).json({ success: false, message: "Teacher not found." });
});

adminRouter.delete('/teachers/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const t = await prisma.teacher.findUnique({
    where: { id }
  });
  if (t) {
    await prisma.teacher.update({
      where: { id: t.id },
      data: { deleted: true }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Teacher not found." });
});

adminRouter.get('/semesters', async (req: Request, res: Response) => {
  const list = await prisma.semester.findMany({
    where: { deleted: false },
    include: {
      students: {
        include: {
          student: true
        }
      },
      courses: {
        include: {
          courseInfo: true
        }
      }
    }
  });

  const formatted = list.map(sc => ({
    id: sc.id,
    deleted: sc.deleted,
    level: sc.level,
    semester: sc.semester,
    startDate: sc.startDate ? JSON.parse(sc.startDate) : null,
    endDate: sc.endDate ? JSON.parse(sc.endDate) : null,
    students: sc.students.filter(s => !s.student.deleted).map(s => s.student.id),
    courses: sc.courses.filter(c => !c.courseInfo.deleted).map(c => c.courseInfoId)
  }));

  res.json({ success: true, semesters: formatted });
});

adminRouter.post('/semesters', async (req: Request, res: Response) => {
  const { level, semester, startDate, endDate, students, courses } = req.body;
  const newSemester = await prisma.semester.create({
    data: {
      level: level || '',
      semester: semester || '',
      startDate: startDate ? JSON.stringify(startDate) : null,
      endDate: endDate ? JSON.stringify(endDate) : null
    }
  });

  if (students && Array.isArray(students)) {
    for (const sid of students) {
      await prisma.studentSemester.create({
        data: {
          studentId: sid,
          semesterId: newSemester.id
        }
      });
    }
  }

  if (courses && Array.isArray(courses)) {
    for (const ciId of courses) {
      await prisma.semesterCourseInfo.create({
        data: {
          courseInfoId: ciId,
          semesterId: newSemester.id
        }
      });
    }
  }

  res.json({
    success: true,
    semester: {
      id: newSemester.id,
      deleted: newSemester.deleted,
      level: newSemester.level,
      semester: newSemester.semester,
      startDate: newSemester.startDate ? JSON.parse(newSemester.startDate) : null,
      endDate: newSemester.endDate ? JSON.parse(newSemester.endDate) : null,
      students: students || [],
      courses: courses || []
    }
  });
});

adminRouter.put('/semesters/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { level, semester, startDate, endDate, students, courses } = req.body;
  const sc = await prisma.semester.findFirst({
    where: { id, deleted: false }
  });

  if (sc) {
    await prisma.semester.update({
      where: { id: sc.id },
      data: {
        level: level !== undefined ? level : sc.level,
        semester: semester !== undefined ? semester : sc.semester,
        startDate: startDate !== undefined ? (startDate ? JSON.stringify(startDate) : null) : sc.startDate,
        endDate: endDate !== undefined ? (endDate ? JSON.stringify(endDate) : null) : sc.endDate
      }
    });

    if (students !== undefined) {
      await prisma.studentSemester.deleteMany({ where: { semesterId: sc.id } });
      for (const sid of students) {
        await prisma.studentSemester.create({
          data: {
            studentId: sid,
            semesterId: sc.id
          }
        });
      }
    }

    if (courses !== undefined) {
      await prisma.semesterCourseInfo.deleteMany({ where: { semesterId: sc.id } });
      for (const ciId of courses) {
        await prisma.semesterCourseInfo.create({
          data: {
            courseInfoId: ciId,
            semesterId: sc.id
          }
        });
      }
    }

    res.json({
      success: true,
      semester: {
        id: sc.id,
        level: level !== undefined ? level : sc.level,
        semester: semester !== undefined ? semester : sc.semester,
        startDate: startDate !== undefined ? startDate : (sc.startDate ? JSON.parse(sc.startDate) : null),
        endDate: endDate !== undefined ? endDate : (sc.endDate ? JSON.parse(sc.endDate) : null),
        students: students !== undefined ? students : [],
        courses: courses !== undefined ? courses : []
      }
    });
    return;
  }
  res.status(404).json({ success: false, message: "Semester not found." });
});

adminRouter.delete('/semesters/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const sc = await prisma.semester.findUnique({
    where: { id }
  });
  if (sc) {
    await prisma.semester.update({
      where: { id: sc.id },
      data: { deleted: true }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Semester not found." });
});
