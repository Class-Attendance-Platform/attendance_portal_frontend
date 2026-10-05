import { useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /teacher/courses/[courseInfoId]/students/[profileId]: one student's days. */
export default function TeacherCourseStudent() {
  const { courseInfoId } = useLocalSearchParams<{ courseInfoId: string }>();
  return (
    <PlaceholderPage
      title="Student"
      breadcrumb={[
        { label: 'My courses', href: '/teacher' },
        { label: 'Course', href: `/teacher/courses/${courseInfoId}` as Href },
        { label: 'Student' },
      ]}
    />
  );
}
