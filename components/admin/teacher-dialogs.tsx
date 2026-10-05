import { Check, KeyRound, Pencil, RotateCcw, Trash2, UserPlus } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button, Dialog, Notice, TextField, useMessage } from '@/components/ui';
import { adminApi, type AdminTeacher, type ApiError, type CreateTeacherBody, type UpdateTeacherBody } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDateTime, fullName, plural } from '@/lib/format';
import { makeTemporaryPassword } from './files';
import { AccountPill, DetailRows, fieldError, FormError } from './parts';
import { PasswordHandover, TemporaryPasswordField } from './password';
import { FieldCell, FieldRow } from './student-dialogs';

type TeacherForm = { first_name: string; last_name: string; email: string; employee_id: string; password: string };

const EMPTY_FORM: TeacherForm = { first_name: '', last_name: '', email: '', employee_id: '', password: '' };

/** Add a teacher (approved at once, with a temporary password) or edit one (partial PATCH). */
export function TeacherFormDialog({
  open,
  teacher,
  onClose,
  onSaved,
}: {
  open: boolean;
  teacher: AdminTeacher | null;
  onClose: () => void;
  onSaved: (teacher: AdminTeacher, created: boolean) => void;
}) {
  const message = useMessage();
  const [form, setForm] = React.useState<TeacherForm>(EMPTY_FORM);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [missing, setMissing] = React.useState<Partial<Record<keyof TeacherForm, string>>>({});
  const [saving, setSaving] = React.useState(false);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);
  const editing = !!teacher;

  React.useEffect(() => {
    if (!open) return;
    setForm(
      teacher
        ? { first_name: teacher.first_name, last_name: teacher.last_name, email: teacher.email, employee_id: teacher.employee_id, password: '' }
        : { ...EMPTY_FORM, password: makeTemporaryPassword() }
    );
    setError(null);
    setMissing({});
    setCreated(null);
  }, [open, teacher]);

  const set = (key: keyof TeacherForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    const problems: Partial<Record<keyof TeacherForm, string>> = {};
    if (!form.first_name.trim()) problems.first_name = 'Enter the first name.';
    if (!form.email.trim()) problems.email = 'Enter the email address.';
    if (!form.employee_id.trim()) problems.employee_id = 'Enter the employee ID.';
    if (!editing && !form.password.trim()) problems.password = 'Enter a temporary password.';
    setMissing(problems);
    if (Object.keys(problems).length) return;

    setSaving(true);
    setError(null);
    const values: CreateTeacherBody = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      employee_id: form.employee_id.trim(),
      password: form.password.trim(),
    };
    try {
      if (teacher) {
        const changes: UpdateTeacherBody = {};
        if (values.first_name !== teacher.first_name) changes.first_name = values.first_name;
        if (values.last_name !== teacher.last_name) changes.last_name = values.last_name;
        if (values.email.toLowerCase() !== teacher.email.toLowerCase()) changes.email = values.email;
        if (values.employee_id !== teacher.employee_id) changes.employee_id = values.employee_id;
        if (!Object.keys(changes).length) {
          message.info('Nothing was changed.');
          onClose();
          return;
        }
        const result = await adminApi.updateTeacher(teacher.id, changes);
        onSaved(result.teacher, false);
        message.success(`Saved ${fullName(result.teacher)}.`);
        onClose();
      } else {
        const result = await adminApi.createTeacher(values);
        onSaved(result.teacher, true);
        setCreated({ email: result.teacher.email, password: values.password });
      }
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const err = (key: keyof TeacherForm, ...server: string[]) => missing[key] ?? fieldError(error, key, ...server);
  const hasFieldError = !!error && Object.keys(error.fieldErrors).some((key) => key in EMPTY_FORM);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={created ? 'Teacher added' : editing ? 'Edit teacher' : 'Add teacher'}
      description={
        created
          ? 'The account is approved and can sign in now.'
          : editing
            ? undefined
            : 'The account is approved at once. Give the teacher the temporary password.'
      }
      dismissable={!saving}
      actions={
        created ? (
          <Button label="Done" variant="primary" onPress={onClose} />
        ) : (
          <>
            <Button label="Cancel" onPress={onClose} disabled={saving} />
            <Button
              label={editing ? 'Save changes' : 'Add teacher'}
              variant="primary"
              icon={editing ? Check : UserPlus}
              loading={saving}
              onPress={save}
            />
          </>
        )
      }
    >
      {created ? (
        <PasswordHandover email={created.email} password={created.password} />
      ) : (
        <View className="gap-4">
          <FieldRow>
            <FieldCell>
              <TextField label="First name" required value={form.first_name} onChangeText={set('first_name')} error={err('first_name')} autoComplete="off" />
            </FieldCell>
            <FieldCell>
              <TextField label="Last name" value={form.last_name} onChangeText={set('last_name')} error={err('last_name')} autoComplete="off" />
            </FieldCell>
          </FieldRow>
          <TextField
            label="Email"
            required
            value={form.email}
            onChangeText={set('email')}
            error={err('email', 'username')}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="email-address"
            inputMode="email"
          />
          <TextField
            label="Employee ID"
            required
            value={form.employee_id}
            onChangeText={set('employee_id')}
            error={err('employee_id')}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {editing ? null : <TemporaryPasswordField value={form.password} onChange={set('password')} error={err('password')} />}
          {hasFieldError ? null : <FormError error={error} />}
        </View>
      )}
    </Dialog>
  );
}

/** One teacher's details and what an admin can do with the account. */
export function TeacherManageDialog({
  teacher,
  onClose,
  onEdit,
  onResetPassword,
  onDelete,
  onRestore,
  restoring,
}: {
  teacher: AdminTeacher | null;
  onClose: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onRestore: () => void;
  restoring?: boolean;
}) {
  if (!teacher) return <Dialog open={false} onClose={onClose} title="" />;
  return (
    <Dialog
      open
      onClose={onClose}
      title={fullName(teacher)}
      description={`Employee ID ${teacher.employee_id || '—'}`}
      actions={<Button label="Close" onPress={onClose} />}
    >
      <View className="gap-4">
        <AccountPill account={teacher} />
        <DetailRows
          rows={[
            { label: 'Email', value: teacher.email },
            { label: 'Courses', value: plural(teacher.course_count, 'course') },
            { label: 'Last sign-in', value: teacher.last_login ? formatDateTime(teacher.last_login) : 'Never' },
          ]}
        />
        {teacher.deleted ? (
          <View className="gap-3">
            <Notice tone="info" message="This account is deleted: it cannot sign in. Restoring it brings it back." />
            <Button label="Restore teacher" variant="primary" icon={RotateCcw} loading={restoring} onPress={onRestore} />
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            <Button label="Edit details" icon={Pencil} onPress={onEdit} />
            <Button label="Reset password" icon={KeyRound} onPress={onResetPassword} />
            <Button label="Delete" variant="quiet" destructive icon={Trash2} onPress={onDelete} />
          </View>
        )}
      </View>
    </Dialog>
  );
}
