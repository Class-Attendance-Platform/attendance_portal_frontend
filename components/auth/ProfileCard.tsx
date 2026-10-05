import { Pencil } from 'lucide-react-native';
import * as React from 'react';
import { View, type TextInput } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/hooks/AuthContext';
import { authApi } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
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
    { label: 'Role', value: roleLabel(user.role) },
    { label: 'Department', value: 'CSE' },
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

/** Who changes the rest (admins edit students and teachers on their pages). */
const OTHER_CHANGES: Record<User['role'], string | null> = {
  STUDENT: 'To change your email, student ID, level or term, ask an admin.',
  TEACHER: 'To change your email or employee ID, ask an admin.',
  ADMIN: null,
};

/** Who is signed in. Only the name can be changed here (PATCH /auth/me/). */
export function ProfileCard({ user }: { user: User }) {
  const [editing, setEditing] = React.useState(false);
  const name = fullName(user);
  return (
    <Card
      title="Profile"
      actions={<Button label="Edit name" icon={Pencil} compact onPress={() => setEditing(true)} />}
      className="gap-4"
    >
      <View className="flex-row items-center gap-4">
        <Avatar name={name} size={56} />
        <View className="flex-1 gap-0.5">
          <Text variant="section" selectable>
            {name}
          </Text>
          <Text tone="muted">{roleLabel(user.role)} · Department of CSE</Text>
        </View>
      </View>
      <View className="border-t border-border">
        {profileRows(user).map((row, index) => (
          <Row key={row.label} first={index === 0} {...row} />
        ))}
      </View>
      {OTHER_CHANGES[user.role] ? (
        <Text variant="small" tone="muted">
          {OTHER_CHANGES[user.role]}
        </Text>
      ) : null}
      {editing ? <EditNameDialog user={user} onClose={() => setEditing(false)} /> : null}
    </Card>
  );
}

function EditNameDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { setUser } = useAuth();
  const message = useMessage();
  const [firstName, setFirstName] = React.useState(user.first_name);
  const [lastName, setLastName] = React.useState(user.last_name);
  const [errors, setErrors] = React.useState<{ first_name?: string; last_name?: string }>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const lastRef = React.useRef<TextInput>(null);

  async function save() {
    if (saving) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) {
      setErrors({ first_name: 'Enter your first name.' });
      return;
    }
    setErrors({});
    setProblem(null);
    if (first === user.first_name && last === user.last_name) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const response = await authApi.updateMe({ first_name: first, last_name: last });
      setUser(response.user);
      onClose();
      message.success('Your name was saved.');
    } catch (error) {
      setSaving(false);
      if (isApiError(error) && (error.field('first_name') || error.field('last_name'))) {
        setErrors({ first_name: error.field('first_name'), last_name: error.field('last_name') });
      } else {
        setProblem(isApiError(error) ? error.message : 'Could not save your name. Please try again.');
      }
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit your name"
      description="Teachers and admins see this name in class lists and reports."
      size="sm"
      dismissable={!saving}
      actions={
        <>
          <Button label="Cancel" onPress={onClose} disabled={saving} />
          <Button label={saving ? 'Saving…' : 'Save'} variant="primary" loading={saving} onPress={save} />
        </>
      }
    >
      <View className="gap-4">
        {problem ? <Notice live tone="error" message={problem} /> : null}
        <TextField
          label="First name"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            if (errors.first_name) setErrors((current) => ({ ...current, first_name: undefined }));
          }}
          error={errors.first_name}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => lastRef.current?.focus()}
          disabled={saving}
          autoFocus
        />
        <TextField
          ref={lastRef}
          label="Last name"
          hint="Leave it empty if you have only one name."
          value={lastName}
          onChangeText={setLastName}
          error={errors.last_name}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={save}
          disabled={saving}
        />
      </View>
    </Dialog>
  );
}
