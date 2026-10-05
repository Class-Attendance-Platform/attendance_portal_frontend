import { Link } from 'expo-router';
import { Check, GraduationCap, Upload, UserPlus } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useAppConfig, useDebounced, useLoad } from '@/components/admin/hooks';
import { levelOptions, termOptions } from '@/components/admin/options';
import { AccountPill, FilterBar, FilterItem, LoadBlock, ResponsiveList, TwoLines } from '@/components/admin/parts';
import { ResetPasswordDialog } from '@/components/admin/password';
import { FacesDialog, StudentFormDialog, StudentManageDialog } from '@/components/admin/student-dialogs';
import { Page } from '@/components/layout/Page';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  SearchField,
  Select,
  Text,
  useConfirm,
  useMessage,
  type Column,
} from '@/components/ui';
import { adminApi, type AdminStudent, type PersonStatus } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDate, fullName, levelTermLabel, plural } from '@/lib/format';

const STATUS_OPTIONS: { label: string; value: PersonStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Deleted', value: 'deleted' },
];

/** /admin/students: search, filters, add, edit, reset password, faces, delete and restore. */
export default function AdminStudents() {
  const config = useAppConfig();
  const confirm = useConfirm();
  const message = useMessage();
  const [search, setSearch] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [term, setTerm] = React.useState('');
  const [status, setStatus] = React.useState<PersonStatus>('active');
  const query = useDebounced(search.trim(), 300);

  const list = useLoad(
    () => adminApi.students({ search: query, level: level || undefined, semester: term || undefined, status }).then((r) => r.students),
    [query, level, term, status]
  );

  const [selected, setSelected] = React.useState<AdminStudent | null>(null);
  const [form, setForm] = React.useState<{ open: boolean; student: AdminStudent | null }>({ open: false, student: null });
  const [resetFor, setResetFor] = React.useState<AdminStudent | null>(null);
  const [facesFor, setFacesFor] = React.useState<AdminStudent | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const filtered = !!(query || level || term);
  const replace = (student: AdminStudent) =>
    list.setData((rows) => (rows ? rows.map((row) => (row.id === student.id ? student : row)) : rows));
  const drop = (student: AdminStudent) => list.setData((rows) => (rows ? rows.filter((row) => row.id !== student.id) : rows));

  async function remove(student: AdminStudent) {
    setSelected(null);
    const name = fullName(student);
    const ok = await confirm({
      title: `Delete ${name}?`,
      message:
        'They can no longer sign in and their face data is removed. Their attendance history stays. You can restore the account later (Status: Deleted).',
      confirmLabel: 'Delete student',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteStudent(student.id);
      drop(student);
      message.success(`${name} was deleted.`);
    } catch (caught) {
      message.error(toApiError(caught).message);
    }
  }

  async function restore(student: AdminStudent) {
    setRestoring(true);
    try {
      const result = await adminApi.restoreStudent(student.id);
      drop(student);
      setSelected(null);
      // A rejected sign-up comes back still waiting for approval.
      message.success(
        result.student?.is_verified !== false
          ? `${fullName(student)} was restored and can sign in again.`
          : `${fullName(student)} was restored and is waiting for approval again (Approvals).`
      );
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setRestoring(false);
    }
  }

  const columns: Column<AdminStudent>[] = [
    { key: 'student_id', title: 'Student ID', width: 96, render: (row) => <Text tabular>{String(row.student_id)}</Text> },
    {
      key: 'name',
      title: 'Name',
      flex: 2,
      render: (row) => (
        <View className="gap-1">
          <TwoLines main={fullName(row)} sub={row.email} />
          <AccountPill account={row} />
        </View>
      ),
    },
    { key: 'level', title: 'Level and term', flex: 1.2, render: (row) => levelTermLabel(row.current_level, row.current_semester) },
    {
      key: 'semester',
      title: 'Semester',
      flex: 1.9,
      render: (row) => (row.semester ? row.semester.label : <Text tone="muted">None</Text>),
    },
    {
      key: 'face',
      title: 'Face',
      width: 116,
      render: (row) =>
        row.face_registered ? <Pill label="Registered" tone="present" icon={Check} /> : <Text tone="muted">Not yet</Text>,
    },
    {
      key: 'last_login',
      title: 'Last sign-in',
      width: 110,
      render: (row) => (row.last_login ? formatDate(row.last_login) : <Text tone="muted">Never</Text>),
    },
  ];

  const count = list.data?.length ?? 0;
  const meta = list.data
    ? `${plural(count, status === 'deleted' ? 'deleted student' : 'student')}${filtered ? ' found' : ''}`
    : 'Student accounts of the department';

  return (
    <Page>
      <PageHeader
        title="Students"
        meta={meta}
        actions={
          <>
            <Link href="/admin/students/import" asChild>
              <Button label="Import" icon={Upload} />
            </Link>
            <Button label="Add student" variant="primary" icon={UserPlus} onPress={() => setForm({ open: true, student: null })} />
          </>
        }
      />

      <FilterBar>
        <FilterItem grow>
          <SearchField label="Search students" placeholder="Search by name, email or student ID" value={search} onChangeText={setSearch} />
        </FilterItem>
        <FilterItem>
          <Select
            label="Level"
            hideLabel
            value={level}
            options={[{ label: 'All levels', value: '' }, ...levelOptions(config)]}
            onChange={setLevel}
          />
        </FilterItem>
        <FilterItem>
          <Select
            label="Term"
            hideLabel
            value={term}
            options={[{ label: 'All terms', value: '' }, ...termOptions(config)]}
            onChange={setTerm}
          />
        </FilterItem>
        <FilterItem>
          <Select label="Status" hideLabel value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </FilterItem>
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        <LoadBlock state={list} loadingLabel="Loading students…">
          {(students) =>
            students.length === 0 ? (
              filtered ? (
                <EmptyState
                  title="No students match"
                  message="Try another name, email or student ID, or clear the filters."
                  action={{
                    label: 'Clear filters',
                    variant: 'secondary',
                    onPress: () => {
                      setSearch('');
                      setLevel('');
                      setTerm('');
                    },
                  }}
                />
              ) : status === 'deleted' ? (
                <EmptyState title="No deleted students" message="Students you delete show here, so you can restore them." />
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No students yet"
                  message="Add students one by one, or import a class list from a CSV or Excel file."
                  action={{ label: 'Add student', icon: UserPlus, onPress: () => setForm({ open: true, student: null }) }}
                />
              )
            ) : (
              <ResponsiveList
                label="Students"
                rows={students}
                rowKey={(row) => row.id}
                columns={columns}
                onRowPress={setSelected}
                rowLabel={(row) => `${fullName(row)}, ${row.student_id}. Open to manage.`}
                phoneRow={(row) => ({
                  title: fullName(row),
                  subtitle: `${row.student_id} · ${levelTermLabel(row.current_level, row.current_semester)}`,
                  children: (
                    <>
                      <Text variant="small" tone="muted">
                        {row.email}
                      </Text>
                      <Text variant="small" tone="muted">
                        Last sign-in {row.last_login ? formatDate(row.last_login) : 'never'}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {row.face_registered ? <Pill label="Face registered" tone="present" icon={Check} /> : null}
                        {row.semester || row.deleted ? null : <Pill label="Not in a semester" tone="neutral" />}
                        <AccountPill account={row} />
                      </View>
                    </>
                  ),
                })}
              />
            )
          }
        </LoadBlock>
      </Card>

      <StudentManageDialog
        student={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setForm({ open: true, student: selected });
          setSelected(null);
        }}
        onResetPassword={() => {
          setResetFor(selected);
          setSelected(null);
        }}
        onFaces={() => {
          setFacesFor(selected);
          setSelected(null);
        }}
        onDelete={() => selected && void remove(selected)}
        onRestore={() => selected && void restore(selected)}
        restoring={restoring}
      />
      <StudentFormDialog
        open={form.open}
        student={form.student}
        onClose={() => setForm({ open: false, student: null })}
        onSaved={(student, created) => {
          if (created) void list.reload();
          else replace(student);
        }}
      />
      <ResetPasswordDialog
        person={resetFor ? { userId: resetFor.user_id, name: fullName(resetFor), email: resetFor.email } : null}
        onClose={() => setResetFor(null)}
      />
      <FacesDialog student={facesFor} onClose={() => setFacesFor(null)} onReset={(student) => replace({ ...student, face_registered: false })} />
    </Page>
  );
}
