import { Link } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import type { User } from '@/lib/api/types';
import { formatDate, fullName, levelTermLabel, roleLabel } from '@/lib/format';

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={`flex-row flex-wrap justify-between gap-x-4 gap-y-0.5 py-3 ${first ? '' : 'border-t border-border'}`}>
      <Text tone="muted">{label}</Text>
      <Text weight="medium" className="flex-shrink" selectable>
        {value}
      </Text>
    </View>
  );
}

function profileRows(user: User): { label: string; value: string }[] {
  const rows = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: `${roleLabel(user.role)} · CSE` },
  ];
  if (user.student_profile) {
    rows.push(
      { label: 'Student ID', value: String(user.student_profile.student_id) },
      {
        label: 'Level and term',
        value: levelTermLabel(user.student_profile.current_level, user.student_profile.current_semester),
      }
    );
  }
  if (user.teacher_profile?.employee_id) rows.push({ label: 'Employee ID', value: user.teacher_profile.employee_id });
  if (user.date_joined) rows.push({ label: 'Member since', value: formatDate(user.date_joined) });
  return rows;
}

/** /account: who is signed in, and sign out. (Name and password changes come with the account screens.) */
export default function AccountScreen() {
  const { user, logout } = useAuth();
  const message = useMessage();
  const [signingOut, setSigningOut] = React.useState(false);
  if (!user) return null;

  const name = fullName(user);

  async function signOut() {
    setSigningOut(true);
    await logout();
    message.info('You have signed out.');
  }

  return (
    <Page>
      <PageHeader title="Account" meta="Your profile and sign-in" />

      <Card>
        <View className="flex-row items-center gap-4 pb-3">
          <Avatar name={name} size={56} />
          <View className="flex-1 gap-0.5">
            <Text variant="section">{name}</Text>
            <Text tone="muted">{roleLabel(user.role)} · Department of CSE</Text>
          </View>
        </View>
        <View className="border-t border-border">
          {profileRows(user).map((row, index) => (
            <Row key={row.label} first={index === 0} {...row} />
          ))}
        </View>
        <Text variant="small" tone="muted" className="mt-2">
          Changing your name or password is coming soon in the new design. Until then, ask an admin.
        </Text>
      </Card>

      <Card title="Sign out" className="gap-3">
        <Text tone="muted">Sign out of the portal on this device. You can sign in again with your email and password.</Text>
        <Button label="Sign out" icon={LogOut} loading={signingOut} onPress={signOut} />
      </Card>

      {/* Rows 24 px apart when they wrap, so the links' 44 px touch areas do not overlap. */}
      <View className="flex-row flex-wrap gap-x-6 gap-y-6">
        {user.role === 'STUDENT' ? (
          <Link href="/student/face" asChild>
            <TextLink label="Face registration" />
          </Link>
        ) : null}
        <Link href="/about" asChild>
          <TextLink label="About this app" />
        </Link>
      </View>
    </Page>
  );
}
