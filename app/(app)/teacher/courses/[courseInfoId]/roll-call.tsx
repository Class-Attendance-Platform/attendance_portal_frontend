import { useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /teacher/courses/[courseInfoId]/roll-call: roll call with a date picker. */
export default function TeacherRollCall() {
  const { courseInfoId } = useLocalSearchParams<{ courseInfoId: string }>();
  return (
    <PlaceholderPage
      title="Roll call"
      breadcrumb={[
        { label: 'My courses', href: '/teacher' },
        { label: 'Course', href: `/teacher/courses/${courseInfoId}` as Href },
        { label: 'Roll call' },
      ]}
    />
  );
}
