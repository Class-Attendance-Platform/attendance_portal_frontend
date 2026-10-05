import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /admin/attendance/[courseInfoId]: read-only attendance and exports. */
export default function AdminCourseAttendance() {
  return (
    <PlaceholderPage
      title="Course attendance"
      breadcrumb={[
        { label: 'Attendance', href: '/admin/attendance' },
        { label: 'Course' },
      ]}
    />
  );
}
