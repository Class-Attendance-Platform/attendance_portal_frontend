import { Redirect } from 'expo-router';
import * as React from 'react';

/** Old route: /dashboard → the start page (which picks the user's home). */
export default function OldDashboardRedirect() {
  return <Redirect href="/" />;
}
