import { Response } from 'express';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { resolveCourseInfo } from './queries';
import { HistorySession } from './types';

export async function exportAttendanceReport(
  res: Response,
  courseInfoId: string,
  format: string,
  targetDate?: string
): Promise<void> {
  const ci = await resolveCourseInfo(courseInfoId);
  if (!ci) {
    res.status(404).send("Course not found.");
    return;
  }

  const students = ci.students;
  const attendance = ci.attendance;

  if (format === 'csv') {
    if (targetDate) {
      const session = (attendance.history || []).find((h: HistorySession) => h.date === targetDate);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}-${targetDate}.csv"`);
      
      let csv = "Student ID,Student Name,Status\n";
      students.forEach((s: any) => {
        const isPresent = session ? session.presentStudents.includes(s.studentId) : false;
        csv += `${s.studentId},"${s.userName}",${isPresent ? 'Present' : 'Absent'}\n`;
      });
      res.send(csv);
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}.csv"`);
    
    let csv = "Student ID,Student Name,Attendance Percentage\n";
    students.forEach((s: any) => {
      const count = attendance.attendanceMap[s.studentId] || 0;
      const pct = attendance.totalClasses > 0 ? (count / attendance.totalClasses) * 100 : 0;
      csv += `${s.studentId},"${s.userName}",${pct.toFixed(2)}%\n`;
    });
    res.send(csv);
    return;
  }

  if (format === 'xlsx') {
    if (targetDate) {
      const session = (attendance.history || []).find((h: HistorySession) => h.date === targetDate);
      const wb = xlsx.utils.book_new();
      const wsData: any[][] = [
        ["Student ID", "Student Name", `Status (${targetDate})`]
      ];
      students.forEach((s: any) => {
        const isPresent = session ? session.presentStudents.includes(s.studentId) : false;
        wsData.push([s.studentId, s.userName, isPresent ? 'Present' : 'Absent']);
      });

      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, "Attendance Date");
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}-${targetDate}.xlsx"`);
      res.send(buffer);
      return;
    }

    const wb = xlsx.utils.book_new();
    const wsData: any[][] = [
      ["Student ID", "Student Name", "Attendance Rate"]
    ];
    students.forEach((s: any) => {
      const count = attendance.attendanceMap[s.studentId] || 0;
      const pct = attendance.totalClasses > 0 ? (count / attendance.totalClasses) * 100 : 0;
      wsData.push([s.studentId, s.userName, `${pct.toFixed(2)}%`]);
    });

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${ci.course.code}.xlsx"`);
    res.send(buffer);
    return;
  }

  if (format === 'pdf') {
    if (targetDate) {
      const session = (attendance.history || []).find((h: HistorySession) => h.date === targetDate);
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

      students.forEach((s: any) => {
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

    students.forEach((s: any) => {
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
}
