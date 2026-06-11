import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../db';
import { getSession } from '../sessionManager';

export const portalRouter = express.Router();

const publicDir = path.join(__dirname, '../../public');

portalRouter.get('/attendance/submit', (req: Request, res: Response) => {
  const { courseInfoId } = req.query;
  const indexFile = path.join(publicDir, 'index.html');
  
  if (!fs.existsSync(indexFile)) {
    return res.status(404).send("Attendance form not found.");
  }

  let html = fs.readFileSync(indexFile, 'utf8');
  html = html.replace('action="/submit"', `action="/attendance/submit?courseInfoId=${courseInfoId || ''}"`);
  res.send(html);
});

portalRouter.post('/attendance/submit', async (req: Request, res: Response) => {
  const { student_id } = req.body;
  const { courseInfoId } = req.query;

  if (!courseInfoId || !student_id) {
    return res.redirect('/not-found.html');
  }

  const session = getSession(courseInfoId as string);
  if (!session) {
    return res.redirect('/not-found.html');
  }

  const student = await prisma.student.findFirst({
    where: { studentId: parseInt(student_id.toString(), 10), deleted: false }
  });
  if (!student) {
    return res.redirect('/not-found.html');
  }

  session.submittedStudents.add(student.studentId.toString());
  console.log(`Log: Recorded student ID ${student.studentId} (${student.userName}) for active session.`);

  res.redirect('/success.html');
});

portalRouter.post('/api/esp32/attendance', async (req: Request, res: Response) => {
  const { courseInfoId, studentId } = req.body;
  if (!courseInfoId || !studentId) {
    return res.status(400).json({ success: false, message: "courseInfoId and studentId are required." });
  }

  const session = getSession(courseInfoId);
  if (!session) {
    return res.status(400).json({ success: false, message: "No active attendance session running for this course." });
  }

  const student = await prisma.student.findFirst({
    where: { studentId: parseInt(studentId.toString(), 10), deleted: false }
  });
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  session.submittedStudents.add(student.studentId.toString());
  console.log(`[ESP32 RFID Log]: Student ID ${student.studentId} (${student.userName}) registered via device.`);

  res.json({ success: true, message: `Student ${student.userName} registered.` });
});

portalRouter.get('/api/config/credits', (req: Request, res: Response) => {
  res.json({
    success: true,
    creditEnumMap: {
      '1.00': 'CREDIT_1_00',
      '1.50': 'CREDIT_1_50',
      '2.00': 'CREDIT_2_00',
      '3.00': 'CREDIT_3_00',
    },
    revCreditMap: {
      'CREDIT_1_00': '1.00',
      'CREDIT_1_50': '1.50',
      'CREDIT_2_00': '2.00',
      'CREDIT_3_00': '3.00',
    }
  });
});

portalRouter.get('/api/config/faculties', (req: Request, res: Response) => {
  res.json({
    success: true,
    faculties: [
      'COMPUTER_SCIENCE_AND_ENGINEERING',
      'ENGINEERING',
      'AGRICULTURE',
      'BUSINESS_STUDIES'
    ]
  });
});

portalRouter.get('/api/config/departments', (req: Request, res: Response) => {
  res.json({
    success: true,
    departments: [
      'COMPUTER_SCIENCE_AND_ENGINEERING',
      'INFORMATION_AND_COMMUNICATION_TECHNOLOGY',
      'ELECTRICAL_AND_ELECTRONIC_ENGINEERING',
      'AGRICULTURE_CHEMISTRY'
    ]
  });
});
