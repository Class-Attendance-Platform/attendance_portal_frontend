import { Check, KeyRound, Pencil, RotateCcw, ScanFace, Trash2, UserPlus } from 'lucide-react-native';
import * as React from 'react';
import { Image, View } from 'react-native';

import { Button, Dialog, EmptyState, LoadingState, Notice, Pill, Select, Text, TextField, useConfirm, useMessage } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  adminApi,
  facesApi,
  type AdminStudent,
  type AdminStudentFacesResponse,
  type ApiError,
  type CreateStudentBody,
  type UpdateStudentBody,
} from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDate, formatDateTime, fullName, levelTermLabel } from '@/lib/format';
import { colors } from '@/lib/theme';
import { makeTemporaryPassword } from './files';
import { useAppConfig } from './hooks';
import { levelOptions, termOptions } from './options';
import { AccountPill, DetailRows, fieldError, FormError } from './parts';
import { PasswordHandover, TemporaryPasswordField } from './password';

type StudentForm = {
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  current_level: string;
  current_semester: string;
  password: string;
};

const EMPTY_FORM: StudentForm = {
  first_name: '',
  last_name: '',
  email: '',
  student_id: '',
  current_level: '',
  current_semester: '',
  password: '',
};

function formFrom(student: AdminStudent | null): StudentForm {
  if (!student) return { ...EMPTY_FORM, password: makeTemporaryPassword() };
  return {
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    student_id: String(student.student_id),
    current_level: student.current_level,
    current_semester: student.current_semester,
    password: '',
  };
}

/** Two fields side by side on wide screens, one under the other on phones. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  const { isDesktop } = useBreakpoint();
  return <View className={isDesktop ? 'flex-row gap-3' : 'gap-4'}>{children}</View>;
}

export function FieldCell({ children }: { children: React.ReactNode }) {
  const { isDesktop } = useBreakpoint();
  return <View className={isDesktop ? 'flex-1' : undefined}>{children}</View>;
}

/** Add a student (approved at once, with a temporary password) or edit one (partial PATCH). */
export function StudentFormDialog({
  open,
  student,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null: add a new student. */
  student: AdminStudent | null;
  onClose: () => void;
  onSaved: (student: AdminStudent, created: boolean) => void;
}) {
  const config = useAppConfig();
  const message = useMessage();
  const [form, setForm] = React.useState<StudentForm>(EMPTY_FORM);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [missing, setMissing] = React.useState<Partial<Record<keyof StudentForm, string>>>({});
  const [saving, setSaving] = React.useState(false);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);
  const editing = !!student;

  React.useEffect(() => {
    if (open) {
      setForm(formFrom(student));
      setError(null);
      setMissing({});
      setCreated(null);
    }
  }, [open, student]);

  const set = (key: keyof StudentForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  function check(): boolean {
    const problems: Partial<Record<keyof StudentForm, string>> = {};
    if (!form.first_name.trim()) problems.first_name = 'Enter the first name.';
    if (!form.email.trim()) problems.email = 'Enter the email address.';
    if (!/^\d+$/.test(form.student_id.trim())) problems.student_id = 'Enter the student ID (digits only).';
    if (!form.current_level) problems.current_level = 'Choose the level.';
    if (!form.current_semester) problems.current_semester = 'Choose the term.';
    if (!editing && !form.password.trim()) problems.password = 'Enter a temporary password.';
    setMissing(problems);
    return Object.keys(problems).length === 0;
  }

  async function save() {
    if (!check()) return;
    setSaving(true);
    setError(null);
    const values: CreateStudentBody = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      student_id: Number(form.student_id.trim()),
      current_level: form.current_level,
      current_semester: form.current_semester,
      password: form.password.trim(),
    };
    try {
      if (student) {
        const changes: UpdateStudentBody = {};
        if (values.first_name !== student.first_name) changes.first_name = values.first_name;
        if (values.last_name !== student.last_name) changes.last_name = values.last_name;
        if (values.email.toLowerCase() !== student.email.toLowerCase()) changes.email = values.email;
        if (values.student_id !== student.student_id) changes.student_id = values.student_id;
        if (values.current_level !== student.current_level) changes.current_level = values.current_level;
        if (values.current_semester !== student.current_semester) changes.current_semester = values.current_semester;
        if (!Object.keys(changes).length) {
          message.info('Nothing was changed.');
          onClose();
          return;
        }
        const result = await adminApi.updateStudent(student.id, changes);
        onSaved(result.student, false);
        message.success(`Saved ${fullName(result.student)}.`);
        onClose();
      } else {
        const result = await adminApi.createStudent(values);
        onSaved(result.student, true);
        setCreated({ email: result.student.email, password: values.password });
      }
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const err = (key: keyof StudentForm, ...server: string[]) => missing[key] ?? fieldError(error, key, ...server);
  const hasFieldError = !!error && Object.keys(error.fieldErrors).some((key) => key in EMPTY_FORM);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={created ? 'Student added' : editing ? 'Edit student' : 'Add student'}
      description={
        created
          ? 'The account is approved and can sign in now.'
          : editing
            ? undefined
            : 'The account is approved at once. Give the student the temporary password.'
      }
      dismissable={!saving}
      actions={
        created ? (
          <Button label="Done" variant="primary" onPress={onClose} />
        ) : (
          <>
            <Button label="Cancel" onPress={onClose} disabled={saving} />
            <Button
              label={editing ? 'Save changes' : 'Add student'}
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
            label="Student ID"
            required
            value={form.student_id}
            onChangeText={set('student_id')}
            error={err('student_id')}
            keyboardType="number-pad"
            inputMode="numeric"
            hint="The university roll number, e.g. 2302001."
          />
          <FieldRow>
            <FieldCell>
              <Select
                label="Level"
                required
                value={form.current_level || null}
                options={levelOptions(config)}
                onChange={set('current_level')}
                error={err('current_level')}
              />
            </FieldCell>
            <FieldCell>
              <Select
                label="Term"
                required
                value={form.current_semester || null}
                options={termOptions(config)}
                onChange={set('current_semester')}
                error={err('current_semester')}
              />
            </FieldCell>
          </FieldRow>
          {editing ? null : <TemporaryPasswordField value={form.password} onChange={set('password')} error={err('password')} />}
          {hasFieldError ? null : <FormError error={error} />}
        </View>
      )}
    </Dialog>
  );
}

/** One student's details and what an admin can do with the account. */
export function StudentManageDialog({
  student,
  onClose,
  onEdit,
  onResetPassword,
  onFaces,
  onDelete,
  onRestore,
  restoring,
}: {
  student: AdminStudent | null;
  onClose: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onFaces: () => void;
  onDelete: () => void;
  onRestore: () => void;
  restoring?: boolean;
}) {
  if (!student) return <Dialog open={false} onClose={onClose} title="" />;
  const name = fullName(student);
  return (
    <Dialog
      open
      onClose={onClose}
      title={name}
      description={`Student ID ${student.student_id}`}
      actions={<Button label="Close" onPress={onClose} />}
    >
      <View className="gap-4">
        <AccountPill account={student} />
        <DetailRows
          rows={[
            { label: 'Email', value: student.email },
            { label: 'Level and term', value: levelTermLabel(student.current_level, student.current_semester) },
            { label: 'Semester', value: student.semester?.label ?? 'Not in an active semester' },
            {
              label: 'Face',
              value: student.face_registered ? <Pill label="Registered" tone="present" icon={Check} /> : 'Not registered',
            },
            { label: 'Last sign-in', value: student.last_login ? formatDateTime(student.last_login) : 'Never' },
          ]}
        />
        {student.deleted ? (
          <View className="gap-3">
            <Notice
              tone="info"
              message="This account is deleted: it cannot sign in. Restoring it brings it back with its history. Classes held while it was deleted count as absent; their teachers can mark those days present."
            />
            <Button label="Restore student" variant="primary" icon={RotateCcw} loading={restoring} onPress={onRestore} />
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            <Button label="Edit details" icon={Pencil} onPress={onEdit} />
            <Button label="Reset password" icon={KeyRound} onPress={onResetPassword} />
            <Button label="Face photos" icon={ScanFace} onPress={onFaces} />
            <Button label="Delete" variant="quiet" destructive icon={Trash2} onPress={onDelete} />
          </View>
        )}
      </View>
    </Dialog>
  );
}

const POSE_LABELS: Record<string, string> = { STRAIGHT: 'Straight', LEFT: 'Turned left', RIGHT: 'Turned right' };
const POSE_ORDER = ['STRAIGHT', 'LEFT', 'RIGHT'];

/** The face photos a student registered (small crops), with a reset. */
export function FacesDialog({
  student,
  onClose,
  onReset,
}: {
  student: AdminStudent | null;
  onClose: () => void;
  onReset: (student: AdminStudent) => void;
}) {
  const confirm = useConfirm();
  const message = useMessage();
  const [faces, setFaces] = React.useState<AdminStudentFacesResponse | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      setFaces(await facesApi.adminStudent(student.id));
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setLoading(false);
    }
  }, [student]);

  React.useEffect(() => {
    setFaces(null);
    if (student) void load();
  }, [student, load]);

  async function reset() {
    if (!student) return;
    const name = fullName(student);
    // Close this dialog first, then ask: the result shows on the list.
    onClose();
    const ok = await confirm({
      title: `Reset ${name}'s face?`,
      message: 'Their face photos are deleted. Face attendance cannot find them until they register again in the app.',
      confirmLabel: 'Reset face',
      destructive: true,
    });
    if (!ok) return;
    setResetting(true);
    try {
      await facesApi.adminReset(student.id);
      message.success(`Face data reset for ${name}.`);
      onReset(student);
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setResetting(false);
    }
  }

  const registered = faces?.registered ?? false;
  return (
    <Dialog
      open={!!student}
      onClose={onClose}
      title="Face photos"
      description={student ? `${fullName(student)} · ${student.student_id}` : undefined}
      actions={
        <>
          <Button label="Close" onPress={onClose} />
          {registered ? <Button label="Reset face" variant="danger" icon={RotateCcw} loading={resetting} onPress={reset} /> : null}
        </>
      }
    >
      {loading && !faces ? (
        <LoadingState />
      ) : error ? (
        <View className="gap-3">
          <Notice tone="error" message={error.message} />
          <Button label="Try again" onPress={load} />
        </View>
      ) : faces && !registered ? (
        <EmptyState
          icon={ScanFace}
          title="No face registered"
          message="The student registers their face in the app (Face registration). Face attendance needs it."
        />
      ) : faces ? (
        <View className="gap-4">
          <Text tone="muted">
            Registered {formatDate(faces.registered_at)}. Check that all three photos show this student.
          </Text>
          <View className="flex-row flex-wrap gap-4">
            {[...faces.crops].sort((a, b) => POSE_ORDER.indexOf(a.pose) - POSE_ORDER.indexOf(b.pose)).map((crop) => (
              <View key={crop.pose} className="items-center gap-1.5">
                <Image
                  source={{ uri: crop.image }}
                  accessibilityLabel={`${POSE_LABELS[crop.pose] ?? crop.pose} face photo`}
                  style={{ width: 112, height: 112, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                />
                <Text variant="small" tone="muted">
                  {POSE_LABELS[crop.pose] ?? crop.pose}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Dialog>
  );
}
