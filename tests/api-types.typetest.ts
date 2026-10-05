// Compile-time checks that the API types keep the contract's null cases and fields
// (attendance_portal_backend/docs/api-v2.md). `npx tsc --noEmit` runs them: an
// "Unused '@ts-expect-error' directive" error means a type lost its null case. Nothing runs.
import type { HistoryLog, MarkResponse } from '@/lib/api/sessions';
import type { StudentCourseDetail, StudentCourseSummary, StudentSemester } from '@/lib/api/student';
import type { SetAttendanceResponse } from '@/lib/api/teacher';
import type { CheckInMethod, LogMethod } from '@/lib/api/types';

declare const summary: StudentCourseSummary;
declare const detail: StudentCourseDetail;
declare const semester: StudentSemester;
declare const log: HistoryLog;
declare const marked: MarkResponse;
declare const corrected: SetAttendanceResponse;

// Section 7: classes_needed is null when the minimum can never be reached (e.g. a 100% minimum).
// @ts-expect-error: screens must handle null
export const neededInSummary: number = summary.classes_needed;
// @ts-expect-error: screens must handle null
export const neededInDetail: number = detail.classes_needed;

// Section 7: a semester the student left is still listed with left_at set (history only).
export const membership: [string, string | null, string | null] = [semester.session, semester.joined_at, semester.left_at];

// Section 6: method is null for students absent in a live or face session.
// @ts-expect-error: screens must handle null
export const historyMethod: LogMethod = log.method;

// Older fingerprint-device logs and the hidden devices' check-ins.
export const oldLogMethod: LogMethod = 'FINGERPRINT';
export const deviceCheckIn: CheckInMethod = 'FINGERPRINT';

// Section 5 / 6 responses carry what the screens show next.
export const markedStudent: string = marked.student.name;
export const changed: boolean = corrected.changed;
