import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import * as React from 'react';

/** Old route: /face/class?courseInfoId=… → /teacher/courses/<id>/face. */
export default function OldFaceClassRedirect() {
  const { courseInfoId } = useLocalSearchParams<{ courseInfoId?: string }>();
  const id = Array.isArray(courseInfoId) ? courseInfoId[0] : courseInfoId;
  const valid = id && /^[0-9a-f-]{32,36}$/i.test(id);
  return <Redirect href={(valid ? `/teacher/courses/${id}/face` : '/teacher') as Href} />;
}
