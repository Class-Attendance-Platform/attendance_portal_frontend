const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

const dbManager = require('./db');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Copy static resources from old directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const oldPublicDir = path.join(__dirname, '../old/src/main/resources/public');
if (fs.existsSync(oldPublicDir)) {
  try {
    fs.readdirSync(oldPublicDir).forEach(file => {
      fs.copyFileSync(path.join(oldPublicDir, file), path.join(publicDir, file));
    });
    console.log("Copied static assets from old resources successfully.");
  } catch (err) {
    console.error("Failed to copy static assets from old resources.", err);
  }
}

// Serve public files statically
app.use(express.static(publicDir));

// Active attendance sessions
const activeSessions = new Map();

// Helper: check and auto-expire sessions
function getSession(courseInfoId) {
  const session = activeSessions.get(courseInfoId);
  if (!session) return null;
  if (Date.now() > session.endTime) {
    finalizeSession(courseInfoId);
    return null;
  }
  return session;
}

// Helper: recalculate totalClasses and attendanceMap from history
function recalculateAttendance(attendance) {
  if (!attendance.history) {
    attendance.history = [];
  }
  attendance.totalClasses = attendance.history.length;
  attendance.attendanceMap = {};
  
  attendance.history.forEach(h => {
    (h.presentStudents || []).forEach(studentId => {
      attendance.attendanceMap[studentId] = (attendance.attendanceMap[studentId] || 0) + 1;
    });
  });
}

// Helper: finalize session and write to db
function finalizeSession(courseInfoId) {
  const session = activeSessions.get(courseInfoId);
  if (!session) return;

  const db = dbManager.get();
  const ci = db.courseInfos.find(item => item.id === courseInfoId && !item.deleted);
  if (ci) {
    const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted);
    if (attendance) {
      if (!attendance.history) attendance.history = [];
      const presentStudents = Array.from(session.submittedStudents).map(studentIdStr => parseInt(studentIdStr, 10));
      
      const todayStr = new Date().toISOString().split('T')[0];
      attendance.history.push({
        date: todayStr,
        presentStudents
      });

      recalculateAttendance(attendance);
      dbManager.save();
      console.log(`Finalized session for CourseInfo ${courseInfoId}. Total classes count: ${attendance.totalClasses}.`);
    }
  }
  activeSessions.delete(courseInfoId);
}

// Helper: fully resolve CourseInfo structure
function resolveCourseInfo(ciId) {
  const db = dbManager.get();
  const ci = db.courseInfos.find(item => item.id === ciId && !item.deleted);
  if (!ci) return null;

  const course = db.courses.find(c => c.id === ci.course && !c.deleted) || {};
  const teacher = db.teachers.find(t => t.id === ci.teacher && !t.deleted) || {};
  const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted) || { id: ci.attendance, totalClasses: 0, attendanceMap: {}, history: [] };

  let students = [];
  const sc = db.semesterCourses.find(item => item.courses.includes(ciId) && !item.deleted);
  if (sc) {
    students = db.students.filter(s => sc.students.includes(s.id) && !s.deleted);
  }

  return {
    id: ci.id,
    course,
    teacher: { id: teacher.id, userName: teacher.userName, email: teacher.email },
    attendance,
    students: students.map(s => ({
      id: s.id,
      userName: s.userName,
      studentId: s.studentId,
      email: s.email,
      currentLevel: s.currentLevel,
      currentSemester: s.currentSemester
    }))
  };
}

// --- AUTH API ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = auth.getValidUser(email, password);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "Invalid email/username or password." });
  }
});

app.post('/api/auth/register', (req, res) => {
  const result = auth.registerUser(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// --- STUDENT API ---
app.get('/api/student/:id/semesters', (req, res) => {
  const { id } = req.params;
  const db = dbManager.get();
  const student = db.students.find(s => s.id === id && !s.deleted);
  
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const semestersResolved = student.semesterCourses.map(scId => {
    const sc = db.semesterCourses.find(item => item.id === scId && !item.deleted);
    if (!sc) return null;

    const coursesResolved = sc.courses.map(ciId => {
      const ci = db.courseInfos.find(item => item.id === ciId && !item.deleted);
      if (!ci) return null;

      const course = db.courses.find(c => c.id === ci.course && !c.deleted) || {};
      const teacher = db.teachers.find(t => t.id === ci.teacher && !t.deleted) || {};
      const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted) || { totalClasses: 0, attendanceMap: {} };

      const studentAttendanceCount = attendance.attendanceMap[student.studentId] || 0;
      const rate = attendance.totalClasses > 0 ? (studentAttendanceCount / attendance.totalClasses) * 100 : 0;

      const historyResolved = (attendance.history || []).map(h => ({
        date: h.date,
        present: h.presentStudents.includes(student.studentId)
      }));

      return {
        id: ci.id,
        course,
        teacher: { userName: teacher.userName, email: teacher.email },
        totalClasses: attendance.totalClasses,
        presentCount: studentAttendanceCount,
        percentage: parseFloat(rate.toFixed(2)),
        history: historyResolved
      };
    }).filter(Boolean);

    return {
      id: sc.id,
      level: sc.level,
      semester: sc.semester,
      startDate: sc.startDate,
      endDate: sc.endDate,
      courses: coursesResolved
    };
  }).filter(Boolean);

  res.json({ success: true, semesters: semestersResolved });
});

// --- TEACHER API ---
app.get('/api/teacher/:id/courses', (req, res) => {
  const { id } = req.params;
  const db = dbManager.get();
  const teacher = db.teachers.find(t => t.id === id && !t.deleted);

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const resolveList = (ciIds) => {
    return ciIds.map(ciId => {
      const resolved = resolveCourseInfo(ciId);
      return resolved ? { id: resolved.id, course: resolved.course, totalClasses: resolved.attendance.totalClasses } : null;
    }).filter(Boolean);
  };

  res.json({
    success: true,
    currentCourses: resolveList(teacher.currentCourses),
    previousCourses: resolveList(teacher.previousCourses)
  });
});

app.get('/api/teacher/course-info/:id', (req, res) => {
  const resolved = resolveCourseInfo(req.params.id);
  if (!resolved) {
    return res.status(404).json({ success: false, message: "Course info not found." });
  }
  res.json({ success: true, courseInfo: resolved });
});

app.post('/api/teacher/course-info/:id/update-classes', (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;
  const db = dbManager.get();

  const ci = db.courseInfos.find(item => item.id === id && !item.deleted);
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted);
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  const newTotal = (attendance.totalClasses || 0) + parseInt(delta, 10);
  if (newTotal >= 0) {
    attendance.totalClasses = newTotal;
    dbManager.save();
    return res.json({ success: true, totalClasses: attendance.totalClasses });
  }
  res.status(400).json({ success: false, message: "Total classes cannot be negative." });
});

app.post('/api/teacher/course-info/:id/mark', (req, res) => {
  const { id } = req.params;
  const { studentId, delta } = req.body;
  const db = dbManager.get();

  const ci = db.courseInfos.find(item => item.id === id && !item.deleted);
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted);
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  const currentCount = attendance.attendanceMap[studentId] || 0;
  const newCount = currentCount + parseInt(delta, 10);

  if (newCount < 0) {
    return res.status(400).json({ success: false, message: "Attendance cannot be negative." });
  }
  if (parseInt(delta, 10) > 0 && currentCount >= attendance.totalClasses) {
    return res.status(400).json({ success: false, message: "Attendance count cannot exceed total classes conducted." });
  }

  attendance.attendanceMap[studentId] = newCount;
  res.json({ success: true, attendanceMap: attendance.attendanceMap });
});

app.post('/api/teacher/course-info/:id/history-session', (req, res) => {
  const { id } = req.params;
  const { date, presentStudentIds } = req.body;
  if (!date || !Array.isArray(presentStudentIds)) {
    return res.status(400).json({ success: false, message: "Date and presentStudentIds array are required." });
  }

  const db = dbManager.get();
  const ci = db.courseInfos.find(item => item.id === id && !item.deleted);
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted);
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  if (!attendance.history) attendance.history = [];

  const existingIndex = attendance.history.findIndex(h => h.date === date);
  if (existingIndex >= 0) {
    attendance.history[existingIndex].presentStudents = presentStudentIds;
  } else {
    attendance.history.push({
      date,
      presentStudents: presentStudentIds
    });
  }

  // Sort history by date chronologically
  attendance.history.sort((a, b) => a.date.localeCompare(b.date));

  recalculateAttendance(attendance);
  dbManager.save();

  res.json({ success: true, attendance });
});

app.delete('/api/teacher/course-info/:id/history-session/:date', (req, res) => {
  const { id, date } = req.params;
  const db = dbManager.get();
  const ci = db.courseInfos.find(item => item.id === id && !item.deleted);
  if (!ci) return res.status(404).json({ success: false, message: "Course info not found." });

  const attendance = db.attendances.find(a => a.id === ci.attendance && !a.deleted);
  if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found." });

  if (attendance.history) {
    attendance.history = attendance.history.filter(h => h.date !== date);
  }

  recalculateAttendance(attendance);
  dbManager.save();

  res.json({ success: true, attendance });
});

// --- LIVE CLASS SESSION ---
app.post('/api/teacher/course-info/:id/session/start', (req, res) => {
  const { id } = req.params;
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
    submittedStudents: new Set()
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

app.post('/api/teacher/course-info/:id/session/stop', (req, res) => {
  const { id } = req.params;
  if (!activeSessions.has(id)) {
    return res.status(400).json({ success: false, message: "No active session for this course." });
  }
  finalizeSession(id);
  res.json({ success: true, message: "Session stopped and attendance applied." });
});

app.get('/api/teacher/course-info/:id/session/status', (req, res) => {
  const { id } = req.params;
  const session = getSession(id);

  if (!session) {
    return res.json({ success: true, active: false });
  }

  const db = dbManager.get();
  const submittedList = Array.from(session.submittedStudents).map(studentIdStr => {
    const studentId = parseInt(studentIdStr, 10);
    const student = db.students.find(s => s.studentId === studentId && !s.deleted);
    return {
      studentId,
      userName: student ? student.userName : "Unknown Student"
    };
  });

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

app.post('/api/esp32/attendance', (req, res) => {
  const { courseInfoId, studentId } = req.body;
  if (!courseInfoId || !studentId) {
    return res.status(400).json({ success: false, message: "courseInfoId and studentId are required." });
  }

  const session = getSession(courseInfoId);
  if (!session) {
    return res.status(400).json({ success: false, message: "No active attendance session running for this course." });
  }

  const db = dbManager.get();
  const student = db.students.find(s => s.studentId.toString() === studentId.toString() && !s.deleted);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  session.submittedStudents.add(student.studentId.toString());
  console.log(`[ESP32 RFID Log]: Student ID ${student.studentId} (${student.userName}) registered via device.`);

  res.json({ success: true, message: `Student ${student.userName} registered.` });
});

// --- REPORT EXPORTS ---
app.get('/api/teacher/course-info/:id/export', (req, res) => {
  const { id } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();
  
  const ci = resolveCourseInfo(id);
  if (!ci) {
    return res.status(404).send("Course not found.");
  }

  const students = ci.students;
  const attendance = ci.attendance;

  if (format === 'csv') {
    if (req.query.date) {
      const targetDate = req.query.date;
      const session = (attendance.history || []).find(h => h.date === targetDate);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}-${targetDate}.csv"`);
      
      let csv = "Student ID,Student Name,Status\n";
      students.forEach(s => {
        const isPresent = session ? session.presentStudents.includes(s.studentId) : false;
        csv += `${s.studentId},"${s.userName}",${isPresent ? 'Present' : 'Absent'}\n`;
      });
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}.csv"`);
    
    let csv = "Student ID,Student Name,Attendance Percentage\n";
    students.forEach(s => {
      const count = attendance.attendanceMap[s.studentId] || 0;
      const pct = attendance.totalClasses > 0 ? (count / attendance.totalClasses) * 100 : 0;
      csv += `${s.studentId},"${s.userName}",${pct.toFixed(2)}%\n`;
    });
    return res.send(csv);
  }

  if (format === 'xlsx') {
    if (req.query.date) {
      const targetDate = req.query.date;
      const session = (attendance.history || []).find(h => h.date === targetDate);
      const wb = xlsx.utils.book_new();
      const wsData = [
        ["Student ID", "Student Name", `Status (${targetDate})`]
      ];
      students.forEach(s => {
        const isPresent = session ? session.presentStudents.includes(s.studentId) : false;
        wsData.push([s.studentId, s.userName, isPresent ? 'Present' : 'Absent']);
      });

      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, "Attendance Date");
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}-${targetDate}.xlsx"`);
      return res.send(buffer);
    }

    const wb = xlsx.utils.book_new();
    const wsData = [
      ["Student ID", "Student Name", "Attendance Rate"]
    ];
    students.forEach(s => {
      const count = attendance.attendanceMap[s.studentId] || 0;
      const pct = attendance.totalClasses > 0 ? (count / attendance.totalClasses) * 100 : 0;
      wsData.push([s.studentId, s.userName, `${pct.toFixed(2)}%`]);
    });

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}.xlsx"`);
    return res.send(buffer);
  }

  if (format === 'pdf') {
    if (req.query.date) {
      const targetDate = req.query.date;
      const session = (attendance.history || []).find(h => h.date === targetDate);
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}-${targetDate}.pdf"`);
      doc.pipe(res);

      doc.fontSize(20).text("HSTU Class Attendance Report", { align: 'center' });
      doc.fontSize(14).text(`Course: ${ci.course.title}`, { align: 'center' });
      doc.fontSize(12).text(`Code: ${ci.course.code} | Date: ${targetDate}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(
        "Student ID".padEnd(20) + 
        "Student Name".padEnd(35) + 
        "Status"
      );
      doc.font('Helvetica').fontSize(10);
      doc.text("--------------------------------------------------------------------------------------------------");
      doc.moveDown(0.5);

      students.forEach(s => {
        const isPresent = session ? session.presentStudents.includes(s.studentId) : false;
        doc.text(
          s.studentId.toString().padEnd(20) + 
          s.userName.substring(0, 30).padEnd(35) + 
          (isPresent ? 'Present' : 'Absent')
        );
      });

      doc.end();
      return;
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text("HSTU Attendance Report", { align: 'center' });
    doc.fontSize(14).text(`Course: ${ci.course.title}`, { align: 'center' });
    doc.fontSize(11).text(`Code: ${ci.course.code} | Credits: ${ci.course.credits} | Classes Conducted: ${attendance.totalClasses}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(
      "Student ID".padEnd(20) + 
      "Student Name".padEnd(35) + 
      "Rate"
    );
    doc.font('Helvetica').fontSize(10);
    doc.text("--------------------------------------------------------------------------------------------------");
    doc.moveDown(0.5);

    students.forEach(s => {
      const count = attendance.attendanceMap[s.studentId] || 0;
      const pct = attendance.totalClasses > 0 ? (count / attendance.totalClasses) * 100 : 0;
      doc.text(
        s.studentId.toString().padEnd(20) + 
        s.userName.substring(0, 30).padEnd(35) + 
        `${pct.toFixed(2)}%`
      );
    });

    doc.end();
    return;
  }

  res.status(400).send("Unsupported file format.");
});

// --- ADMIN API ---
app.get('/api/admin/courses', (req, res) => res.json({ success: true, courses: dbManager.getCourses() }));
app.post('/api/admin/courses', (req, res) => {
  const { code, title, content, credits, faculty, department } = req.body;
  const db = dbManager.get();
  const newCourse = {
    id: crypto.randomUUID(),
    deleted: false,
    code: code || '',
    title: title || '',
    content: content || '',
    credits: credits || 'CREDIT_2_00',
    faculty: faculty || 'COMPUTER_SCIENCE_AND_ENGINEERING',
    department: department || 'COMPUTER_SCIENCE_AND_ENGINEERING'
  };
  db.courses.push(newCourse);
  dbManager.save();
  res.json({ success: true, course: newCourse });
});
app.put('/api/admin/courses/:id', (req, res) => {
  const { code, title, content, credits, faculty, department } = req.body;
  const db = dbManager.get();
  const c = db.courses.find(item => item.id === req.params.id && !item.deleted);
  if (c) {
    if (code !== undefined) c.code = code;
    if (title !== undefined) c.title = title;
    if (content !== undefined) c.content = content;
    if (credits !== undefined) c.credits = credits;
    if (faculty !== undefined) c.faculty = faculty;
    if (department !== undefined) c.department = department;
    dbManager.save();
    return res.json({ success: true, course: c });
  }
  res.status(404).json({ success: false, message: "Course not found." });
});
app.delete('/api/admin/courses/:id', (req, res) => {
  const db = dbManager.get();
  const c = db.courses.find(item => item.id === req.params.id);
  if (c) {
    c.deleted = true;
    dbManager.save();
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Course not found." });
});

app.get('/api/admin/students', (req, res) => res.json({ success: true, students: dbManager.getStudents() }));
app.post('/api/admin/students', (req, res) => {
  const { userName, email, studentId, faculty, department, currentLevel, currentSemester, password } = req.body;
  const result = auth.registerUser({
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
app.put('/api/admin/students/:id', (req, res) => {
  const { userName, email, studentId, faculty, department, currentLevel, currentSemester, password } = req.body;
  const db = dbManager.get();
  const s = db.students.find(item => item.id === req.params.id && !item.deleted);
  if (s) {
    if (userName !== undefined) s.userName = userName;
    if (email !== undefined) s.email = email;
    if (studentId !== undefined) s.studentId = parseInt(studentId, 10) || s.studentId;
    if (faculty !== undefined) s.faculty = faculty;
    if (department !== undefined) s.department = department;
    if (currentLevel !== undefined) s.currentLevel = currentLevel;
    if (currentSemester !== undefined) s.currentSemester = currentSemester;
    if (password) {
      s.passwordHash = auth.encryptPassword(password);
    }
    dbManager.save();
    return res.json({ success: true, student: s });
  }
  res.status(404).json({ success: false, message: "Student not found." });
});
app.delete('/api/admin/students/:id', (req, res) => {
  const db = dbManager.get();
  const s = db.students.find(item => item.id === req.params.id);
  if (s) {
    s.deleted = true;
    dbManager.save();
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Student not found." });
});

app.get('/api/admin/teachers', (req, res) => res.json({ success: true, teachers: dbManager.getTeachers() }));
app.post('/api/admin/teachers', (req, res) => {
  const { userName, email, faculty, department, password } = req.body;
  const result = auth.registerUser({
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
app.put('/api/admin/teachers/:id', (req, res) => {
  const { userName, email, faculty, department, password } = req.body;
  const db = dbManager.get();
  const t = db.teachers.find(item => item.id === req.params.id && !item.deleted);
  if (t) {
    if (userName !== undefined) t.userName = userName;
    if (email !== undefined) t.email = email;
    if (faculty !== undefined) t.faculty = faculty;
    if (department !== undefined) t.department = department;
    if (password) {
      t.passwordHash = auth.encryptPassword(password);
    }
    dbManager.save();
    return res.json({ success: true, teacher: t });
  }
  res.status(404).json({ success: false, message: "Teacher not found." });
});
app.delete('/api/admin/teachers/:id', (req, res) => {
  const db = dbManager.get();
  const t = db.teachers.find(item => item.id === req.params.id);
  if (t) {
    t.deleted = true;
    dbManager.save();
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Teacher not found." });
});

app.get('/api/admin/semesters', (req, res) => res.json({ success: true, semesters: dbManager.getSemesterCourses() }));
app.post('/api/admin/semesters', (req, res) => {
  const { level, semester, startDate, endDate, students, courses } = req.body;
  const db = dbManager.get();
  const newSemester = {
    id: crypto.randomUUID(),
    deleted: false,
    level: level || '',
    semester: semester || '',
    startDate: startDate || null,
    endDate: endDate || null,
    students: students || [],
    courses: courses || []
  };
  db.semesterCourses.push(newSemester);
  
  (students || []).forEach(sid => {
    const s = db.students.find(item => item.id === sid);
    if (s && !s.semesterCourses.includes(newSemester.id)) {
      s.semesterCourses.push(newSemester.id);
    }
  });

  dbManager.save();
  res.json({ success: true, semester: newSemester });
});
app.put('/api/admin/semesters/:id', (req, res) => {
  const { level, semester, startDate, endDate, students, courses } = req.body;
  const db = dbManager.get();
  const sc = db.semesterCourses.find(item => item.id === req.params.id && !item.deleted);
  if (sc) {
    if (level !== undefined) sc.level = level;
    if (semester !== undefined) sc.semester = semester;
    if (startDate !== undefined) sc.startDate = startDate;
    if (endDate !== undefined) sc.endDate = endDate;
    
    if (students !== undefined) {
      sc.students.forEach(sid => {
        const student = db.students.find(s => s.id === sid);
        if (student) {
          student.semesterCourses = student.semesterCourses.filter(id => id !== sc.id);
        }
      });
      sc.students = students;
      students.forEach(sid => {
        const student = db.students.find(s => s.id === sid);
        if (student && !student.semesterCourses.includes(sc.id)) {
          student.semesterCourses.push(sc.id);
        }
      });
    }

    if (courses !== undefined) {
      sc.courses = courses;
    }

    dbManager.save();
    return res.json({ success: true, semester: sc });
  }
  res.status(404).json({ success: false, message: "Semester not found." });
});
app.delete('/api/admin/semesters/:id', (req, res) => {
  const db = dbManager.get();
  const sc = db.semesterCourses.find(item => item.id === req.params.id);
  if (sc) {
    sc.deleted = true;
    dbManager.save();
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Semester not found." });
});

// --- STUDENT WEB PORTAL SUBMISSION ROUTE ---
app.get('/attendance/submit', (req, res) => {
  const { courseInfoId } = req.query;
  const indexFile = path.join(publicDir, 'index.html');
  
  if (!fs.existsSync(indexFile)) {
    return res.status(404).send("Attendance form not found.");
  }

  let html = fs.readFileSync(indexFile, 'utf8');
  html = html.replace('action="/submit"', `action="/attendance/submit?courseInfoId=${courseInfoId || ''}"`);
  res.send(html);
});

app.post('/attendance/submit', (req, res) => {
  const { student_id } = req.body;
  const { courseInfoId } = req.query;

  if (!courseInfoId || !student_id) {
    return res.redirect('/not-found.html');
  }

  const session = getSession(courseInfoId);
  if (!session) {
    return res.redirect('/not-found.html');
  }

  const db = dbManager.get();
  const student = db.students.find(s => s.studentId.toString() === student_id.toString() && !s.deleted);
  if (!student) {
    return res.redirect('/not-found.html');
  }

  session.submittedStudents.add(student.studentId.toString());
  console.log(`Log: Recorded student ID ${student.studentId} (${student.userName}) for active session.`);

  res.redirect('/success.html');
});

// App startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express Attendance Server listening at http://localhost:${PORT}`);
});
