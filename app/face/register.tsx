import { Redirect } from 'expo-router';
import * as React from 'react';

/** Old route: /face/register → /student/face. */
export default function OldFaceRegisterRedirect() {
  return <Redirect href="/student/face" />;
}
