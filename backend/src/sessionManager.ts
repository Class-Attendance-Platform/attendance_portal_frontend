import { prisma } from './db';
import { recalculateAttendance } from './queries';

export interface ActiveSession {
  courseInfoId: string;
  endTime: number;
  submittedStudents: Set<string>;
}

export const activeSessions = new Map<string, ActiveSession>();

/**
 * Expires an active session, copies submitted RFID/check-in logs into database history, and updates stats.
 */
export async function finalizeSession(courseInfoId: string): Promise<void> {
  const session = activeSessions.get(courseInfoId);
  if (!session) return;

  const ci = await prisma.courseInfo.findFirst({
    where: { id: courseInfoId, deleted: false }
  });
  
  if (ci) {
    const attendance = await prisma.attendance.findFirst({
      where: { id: ci.attendanceId, deleted: false }
    });
    if (attendance) {
      const history = JSON.parse(attendance.history || '[]');
      const presentStudents = Array.from(session.submittedStudents).map(studentIdStr => parseInt(studentIdStr, 10));
      
      const todayStr = new Date().toISOString().split('T')[0];
      history.push({
        date: todayStr,
        presentStudents
      });

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          history: JSON.stringify(history)
        }
      });

      await recalculateAttendance(attendance.id);
      console.log(`Finalized session for CourseInfo ${courseInfoId}.`);
    }
  }
  activeSessions.delete(courseInfoId);
}

/**
 * Gets the current active session for a course, checking for expiration first.
 */
export function getSession(courseInfoId: string): ActiveSession | null {
  const session = activeSessions.get(courseInfoId);
  if (!session) return null;

  if (Date.now() > session.endTime) {
    finalizeSession(courseInfoId);
    return null;
  }
  return session;
}
