import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /student/courses/[courseInfoId]: one course with each class day. */
export default function StudentCourse() {
  return (
    <PlaceholderPage
      title="Course"
      breadcrumb={[
        { label: 'Courses', href: '/student/courses' },
        { label: 'Course' },
      ]}
    />
  );
}
