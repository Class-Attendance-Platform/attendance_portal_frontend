import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { Page } from '@/components/layout/Page';
import { CheckInFlow } from '@/components/student/CheckInFlow';
import { firstParam } from '@/components/student/logic';

export default function StudentCheckIn() {
  const params = useLocalSearchParams<{ s?: string; c?: string; old?: string }>();
  return (
    <Page>
      <CheckInFlow sessionId={firstParam(params.s)} code={firstParam(params.c)} oldLink={firstParam(params.old) === '1'} />
    </Page>
  );
}
