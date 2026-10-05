import { useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /teacher/courses/[courseInfoId]/face: attendance from class photos. */
export default function TeacherFaceAttendance() {
  const { courseInfoId } = useLocalSearchParams<{ courseInfoId: string }>();
  return (
    <PlaceholderPage
      title="Class photo attendance"
      breadcrumb={[
        { label: 'My courses', href: '/teacher' },
        { label: 'Course', href: `/teacher/courses/${courseInfoId}` as Href },
        { label: 'Class photo' },
      ]}
    />
  );
}
