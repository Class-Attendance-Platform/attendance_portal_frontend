import { Redirect } from 'expo-router';
import * as React from 'react';

/** Old route (code-based password reset): password help now starts on /forgot-password. */
export default function OldVerifyRedirect() {
  return <Redirect href="/forgot-password" />;
}
