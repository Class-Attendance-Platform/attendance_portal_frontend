import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { RequireAuth } from '@/components/layout/RequireAuth';

/** /check-in?s=<session>&c=<code>: the QR link target. Students only; submits once. */
export default function CheckInLinkScreen() {
  return (
    <RequireAuth roles={['STUDENT']}>
      <PlaceholderPage title="Check in" />
    </RequireAuth>
  );
}
