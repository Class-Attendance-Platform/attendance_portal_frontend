import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

const ROLE_AREAS = new Set(['admin', 'teacher', 'student']);
const ADMIN_PAGES = new Set(['courses', 'semesters', 'students', 'teachers']);

/**
 * Old routes: /dashboard/admin/courses → /admin/courses, /dashboard/teacher → /teacher,
 * /dashboard/student → /student. Anything else goes to the start page.
 */
export default function OldDashboardPagesRedirect() {
  const { rest } = useLocalSearchParams<{ rest: string[] }>();
  const parts = (Array.isArray(rest) ? rest : [rest]).filter(Boolean) as string[];
  const [area, page] = parts;
  let target = '/';
  if (area && ROLE_AREAS.has(area)) {
    target = area === 'admin' && page && ADMIN_PAGES.has(page) ? `/admin/${page}` : `/${area}`;
  }
  return <Redirect href={target as Href} />;
}
