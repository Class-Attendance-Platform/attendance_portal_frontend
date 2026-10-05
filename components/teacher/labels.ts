import type { Href } from 'expo-router';

import type { TeacherCourse } from '@/lib/api/teacher';
import type { CheckInMethod, Delivery, ISODate, LogMethod, UUID } from '@/lib/api/types';
import { plural } from '@/lib/format';

// Words and links shared by the teacher screens.

const METHOD_LABELS: Record<LogMethod | CheckInMethod, string> = {
  QR: 'QR scan',
  CODE: 'Typed code',
  FACE: 'Class photo',
  TEACHER: 'Teacher',
  // Older logs from the (hidden) fingerprint devices.
  FINGERPRINT: 'Device',
};

/** "QR scan", "Typed code", "Class photo", "Teacher"; null → "—". */
export function methodLabel(method: LogMethod | CheckInMethod | null | undefined): string {
  return method ? (METHOD_LABELS[method] ?? method) : '—';
}

export function deliveryLabel(delivery: Delivery): string {
  return delivery === 'ONLINE' ? 'Online' : 'In class';
}

/** "CSE301 · Level 3 · Term I · 2025-26 · 12 students" */
export function courseMeta(course: TeacherCourse): string {
  return [course.code, course.semester.label, plural(course.student_count, 'student')].filter(Boolean).join(' · ');
}

/** The finished semester's courses: corrections and roll call only (no live or face sessions). */
export const isFinished = (course: TeacherCourse) => !course.semester.is_active;

export { enrolledOn } from './rules';

export type CourseTab = 'attendance' | 'students' | 'history' | 'reports';

export const courseHref = (courseInfoId: UUID, tab?: CourseTab, extra?: Record<string, string>): Href => {
  const query = new URLSearchParams();
  if (tab && tab !== 'attendance') query.set('tab', tab);
  for (const [key, value] of Object.entries(extra ?? {})) query.set(key, value);
  const search = query.toString();
  return `/teacher/courses/${courseInfoId}${search ? `?${search}` : ''}` as Href;
};

export const rollCallHref = (courseInfoId: UUID, date?: ISODate | null): Href =>
  `/teacher/courses/${courseInfoId}/roll-call${date ? `?date=${date}` : ''}` as Href;

export const faceHref = (courseInfoId: UUID): Href => `/teacher/courses/${courseInfoId}/face` as Href;

export const studentHref = (courseInfoId: UUID, profileId: UUID): Href =>
  `/teacher/courses/${courseInfoId}/students/${profileId}` as Href;

export const liveHref = (sessionId: UUID, courseInfoId?: UUID | null): Href =>
  `/teacher/live/${sessionId}${courseInfoId ? `?course=${courseInfoId}` : ''}` as Href;

/** First value of a route param. */
export function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
