import { UserPlus, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useDebounced, useLoad } from '@/components/admin/hooks';
import { AccountPill, FilterBar, FilterItem, LoadBlock, ResponsiveList, TwoLines } from '@/components/admin/parts';
import { ResetPasswordDialog } from '@/components/admin/password';
import { TeacherFormDialog, TeacherManageDialog } from '@/components/admin/teacher-dialogs';
import { Page } from '@/components/layout/Page';
import { Button, Card, EmptyState, PageHeader, SearchField, Select, Text, useConfirm, useMessage, type Column } from '@/components/ui';
import { adminApi, type AdminTeacher, type PersonStatus } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDate, fullName, plural } from '@/lib/format';

const STATUS_OPTIONS: { label: string; value: PersonStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Deleted', value: 'deleted' },
];

/** /admin/teachers: search, add, edit, reset password, delete and restore. */
export default function AdminTeachers() {
  const confirm = useConfirm();
  const message = useMessage();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<PersonStatus>('active');
  const query = useDebounced(search.trim(), 300);
  const list = useLoad(() => adminApi.teachers({ search: query, status }).then((r) => r.teachers), [query, status]);

  const [selected, setSelected] = React.useState<AdminTeacher | null>(null);
  const [form, setForm] = React.useState<{ open: boolean; teacher: AdminTeacher | null }>({ open: false, teacher: null });
  const [resetFor, setResetFor] = React.useState<AdminTeacher | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const replace = (teacher: AdminTeacher) =>
    list.setData((rows) => (rows ? rows.map((row) => (row.id === teacher.id ? teacher : row)) : rows));
  const drop = (teacher: AdminTeacher) => list.setData((rows) => (rows ? rows.filter((row) => row.id !== teacher.id) : rows));

  async function remove(teacher: AdminTeacher) {
    setSelected(null);
    const name = fullName(teacher);
    const ok = await confirm({
      title: `Delete ${name}?`,
      message:
        teacher.course_count > 0
          ? `They can no longer sign in. Their ${plural(teacher.course_count, 'course')} and all attendance stay: give them to another teacher in the semester's Courses tab. You can restore the account later.`
          : 'They can no longer sign in. You can restore the account later (Status: Deleted).',
      confirmLabel: 'Delete teacher',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteTeacher(teacher.id);
      drop(teacher);
      message.success(`${name} was deleted.`);
    } catch (caught) {
      message.error(toApiError(caught).message);
    }
  }

  async function restore(teacher: AdminTeacher) {
    setRestoring(true);
    try {
      const result = await adminApi.restoreTeacher(teacher.id);
      drop(teacher);
      setSelected(null);
      // A rejected sign-up comes back still waiting for approval.
      message.success(
        result.teacher?.is_verified !== false
          ? `${fullName(teacher)} was restored and can sign in again.`
          : `${fullName(teacher)} was restored and is waiting for approval again (Approvals).`
      );
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setRestoring(false);
    }
  }

  const columns: Column<AdminTeacher>[] = [
    { key: 'employee_id', title: 'Employee ID', width: 132, render: (row) => row.employee_id || '—' },
    {
      key: 'name',
      title: 'Name',
      flex: 2.4,
      render: (row) => (
        <View className="gap-1">
          <TwoLines main={fullName(row)} sub={row.email} />
          <AccountPill account={row} />
        </View>
      ),
    },
    { key: 'courses', title: 'Courses', width: 96, align: 'right', render: (row) => String(row.course_count) },
    {
      key: 'last_login',
      title: 'Last sign-in',
      width: 132,
      render: (row) => (row.last_login ? formatDate(row.last_login) : <Text tone="muted">Never</Text>),
    },
  ];

  const count = list.data?.length ?? 0;
  return (
    <Page>
      <PageHeader
        title="Teachers"
        meta={
          list.data
            ? `${plural(count, status === 'deleted' ? 'deleted teacher' : 'teacher')}${query ? ' found' : ''}`
            : 'Teacher accounts of the department'
        }
        actions={<Button label="Add teacher" variant="primary" icon={UserPlus} onPress={() => setForm({ open: true, teacher: null })} />}
      />

      <FilterBar>
        <FilterItem grow>
          <SearchField label="Search teachers" placeholder="Search by name, email or employee ID" value={search} onChangeText={setSearch} />
        </FilterItem>
        <FilterItem>
          <Select label="Status" hideLabel value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </FilterItem>
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        <LoadBlock state={list} loadingLabel="Loading teachers…">
          {(teachers) =>
            teachers.length === 0 ? (
              query ? (
                <EmptyState
                  title="No teachers match"
                  message="Try another name, email or employee ID."
                  action={{ label: 'Clear search', variant: 'secondary', onPress: () => setSearch('') }}
                />
              ) : status === 'deleted' ? (
                <EmptyState title="No deleted teachers" message="Teachers you delete show here, so you can restore them." />
              ) : (
                <EmptyState
                  icon={Users}
                  title="No teachers yet"
                  message="Add a teacher, or approve teachers who signed up (Approvals)."
                  action={{ label: 'Add teacher', icon: UserPlus, onPress: () => setForm({ open: true, teacher: null }) }}
                />
              )
            ) : (
              <ResponsiveList
                label="Teachers"
                rows={teachers}
                rowKey={(row) => row.id}
                columns={columns}
                onRowPress={setSelected}
                rowLabel={(row) => `${fullName(row)}. Open to manage.`}
                phoneRow={(row) => ({
                  title: fullName(row),
                  subtitle: `${row.employee_id || 'No employee ID'} · ${plural(row.course_count, 'course')}`,
                  children: (
                    <>
                      <Text variant="small" tone="muted">
                        {row.email}
                      </Text>
                      <Text variant="small" tone="muted">
                        Last sign-in {row.last_login ? formatDate(row.last_login) : 'never'}
                      </Text>
                      <AccountPill account={row} />
                    </>
                  ),
                })}
              />
            )
          }
        </LoadBlock>
      </Card>

      <TeacherManageDialog
        teacher={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setForm({ open: true, teacher: selected });
          setSelected(null);
        }}
        onResetPassword={() => {
          setResetFor(selected);
          setSelected(null);
        }}
        onDelete={() => selected && void remove(selected)}
        onRestore={() => selected && void restore(selected)}
        restoring={restoring}
      />
      <TeacherFormDialog
        open={form.open}
        teacher={form.teacher}
        onClose={() => setForm({ open: false, teacher: null })}
        onSaved={(teacher, created) => {
          if (created) void list.reload();
          else replace(teacher);
        }}
      />
      <ResetPasswordDialog
        person={resetFor ? { userId: resetFor.user_id, name: fullName(resetFor), email: resetFor.email } : null}
        onClose={() => setResetFor(null)}
      />
    </Page>
  );
}
