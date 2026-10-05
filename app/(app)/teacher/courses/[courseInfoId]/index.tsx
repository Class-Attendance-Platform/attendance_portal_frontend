import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /teacher/courses/[courseInfoId]?tab=attendance|students|history|reports */
export default function TeacherCourse() {
  return (
    <PlaceholderPage
      title="Course"
      breadcrumb={[
        { label: 'My courses', href: '/teacher' },
        { label: 'Course' },
      ]}
    />
  );
}
