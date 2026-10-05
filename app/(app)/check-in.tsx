import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { House, LogOut, ScanLine } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { useCurrentUrl } from '@/components/layout/RequireAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { CheckInFlow } from '@/components/student/CheckInFlow';
import { firstParam } from '@/components/student/logic';
import { useAuth } from '@/hooks/AuthContext';
import { fullName, roleLabel } from '@/lib/format';
import { homeFor, loginHref } from '@/lib/routes';

/** A teacher or admin opened a student's check-in link: say why nothing happens. */
function NotAStudent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const here = useCurrentUrl();
  const [signingOut, setSigningOut] = React.useState(false);
  if (!user) return null;
  const who = `${fullName(user)} (${roleLabel(user.role).toLowerCase()})`;
  return (
    <Card>
      <EmptyState
        icon={ScanLine}
        title="Check-in is for students"
        message={`You're signed in as ${who}. To check in, sign out and sign in with the student's own account.`}
      />
      <View className="flex-row flex-wrap justify-center gap-2 pb-4">
        <Link href={homeFor(user.role)} asChild>
          <Button label="Go to my home" icon={House} variant="primary" />
        </Link>
        <Button
          label="Sign out"
          icon={LogOut}
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await logout();
            router.replace(loginHref(here));
          }}
        />
      </View>
    </Card>
  );
}

/**
 * /check-in?s=<session>&c=<code>: the QR link target (the phone camera opens it). Signed out:
 * the (app) guard sends people to /login?redirect=… and back here. Students are checked in once,
 * at once; other roles get an explanation.
 */
export default function CheckInLinkScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ s?: string; c?: string }>();
  const student = user?.role === 'STUDENT';
  return (
    <Page>
      <PageHeader title="Check in" meta={student ? 'Checking you in to your class.' : undefined} />
      <View className="w-full max-w-[640px] gap-4">
        {student ? <CheckInFlow sessionId={firstParam(params.s)} code={firstParam(params.c)} /> : <NotAStudent />}
      </View>
    </Page>
  );
}
