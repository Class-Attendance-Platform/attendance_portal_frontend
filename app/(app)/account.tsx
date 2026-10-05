import { Link } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { appVersion, UpdateNotice } from '@/components/auth/AppUpdate';
import { ChangePasswordCard } from '@/components/auth/ChangePasswordCard';
import { FaceStatusCard } from '@/components/auth/FaceStatusCard';
import { ProfileCard } from '@/components/auth/ProfileCard';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

/** Two columns only where both have room next to the sidebar. */
const TWO_COLUMNS_FROM = 1024;

/** /account (every role): profile and name, password, face registration (students), sign out. */
export default function AccountScreen() {
  const { user, logout, refreshUser } = useAuth();
  const message = useMessage();
  const { width, isDesktop } = useBreakpoint();
  const [signingOut, setSigningOut] = React.useState(false);

  // Show what the server has now (an admin may have changed the level or term); quietly.
  React.useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  if (!user) return null;

  const twoColumns = width >= TWO_COLUMNS_FROM;
  const column = cn(isDesktop ? 'gap-5' : 'gap-4', twoColumns && 'flex-1');

  async function signOut() {
    setSigningOut(true);
    await logout();
    message.info('You have signed out.');
  }

  return (
    <Page>
      <PageHeader title="Account" meta="Your profile, password and sign-in" />
      <UpdateNotice />

      <View className={cn(twoColumns ? 'flex-row items-start gap-5' : isDesktop ? 'gap-5' : 'gap-4')}>
        <View className={column}>
          <ProfileCard user={user} />
          {user.role === 'STUDENT' ? <FaceStatusCard /> : null}
        </View>

        <View className={column}>
          <ChangePasswordCard />

          <Card title="About this app" className="gap-3">
            <Text tone="muted">Version {appVersion()}. Credits, the face model licence and how your data is used.</Text>
            {/* Room above and below the link for its 44 px touch area. */}
            <View className="flex-row py-1.5">
              <Link href="/about" asChild>
                <TextLink label="Open About this app" />
              </Link>
            </View>
          </Card>

          <Card title="Sign out" className="gap-3">
            <Text tone="muted">Sign out of the portal on this device. You can sign in again with your email and password.</Text>
            <Button label="Sign out" icon={LogOut} loading={signingOut} onPress={signOut} />
          </Card>
        </View>
      </View>
    </Page>
  );
}
