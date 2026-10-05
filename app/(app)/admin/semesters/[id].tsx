import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /admin/semesters/[id]: roster, courses, promote. */
export default function AdminSemester() {
  return (
    <PlaceholderPage
      title="Semester"
      breadcrumb={[
        { label: 'Semesters', href: '/admin/semesters' },
        { label: 'Semester' },
      ]}
    />
  );
}
