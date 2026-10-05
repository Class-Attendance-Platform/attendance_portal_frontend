import * as React from 'react';

import { PublicPlaceholder } from '@/components/layout/PublicPlaceholder';

export default function ResetPasswordScreen() {
  return (
    <PublicPlaceholder
      title="Choose a new password"
      note="Resetting a password from the email link is coming back soon. Until then, ask an admin to reset your password."
    />
  );
}
