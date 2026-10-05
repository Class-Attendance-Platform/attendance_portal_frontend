import { Redirect } from 'expo-router';
import * as React from 'react';

/** Old route (the old app's code-based verification): sign-in starts on /login now. */
export default function OldVerifyRedirect() {
  return <Redirect href="/login" />;
}
