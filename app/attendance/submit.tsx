import { Redirect } from 'expo-router';
import * as React from 'react';

/**
 * Old QR link target (/attendance/submit?sessionId=…&qrToken=…). Old QR tokens no longer work,
 * so this opens the new check-in page, where the student types the current code.
 */
export default function OldSubmitRedirect() {
  return <Redirect href="/student/check-in" />;
}
