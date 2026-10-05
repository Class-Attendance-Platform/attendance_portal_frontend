import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { PageHeader } from '@/components/ui/page-header';
import { CheckInFlow } from '@/components/student/CheckInFlow';
import { firstParam } from '@/components/student/logic';
import { HAS_QR_SCANNER } from '@/components/student/QrScanner';

/**
 * /student/check-in: the scanner (phones) and the 6-digit code. `?s=` (from the "Live now"
 * banner) names the class; `?s=&c=` (a QR link) checks in at once.
 */
export default function StudentCheckIn() {
  const params = useLocalSearchParams<{ s?: string; c?: string; old?: string }>();
  return (
    <Page>
      <PageHeader
        title="Check in"
        meta={HAS_QR_SCANNER ? 'Scan the QR in class, or type the 6-digit code.' : 'Type the 6-digit code your teacher shows.'}
      />
      <View className="w-full max-w-[640px] gap-4">
        <CheckInFlow sessionId={firstParam(params.s)} code={firstParam(params.c)} oldLink={firstParam(params.old) === '1'} />
      </View>
    </Page>
  );
}
