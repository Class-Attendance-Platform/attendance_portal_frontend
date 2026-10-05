import { Link, type Href } from 'expo-router';
import { Check, GraduationCap, UserCheck, X } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useLoad } from '@/components/admin/hooks';
import { LoadBlock, TwoLines } from '@/components/admin/parts';
import { Page } from '@/components/layout/Page';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ListRow,
  Notice,
  PageHeader,
  Pill,
  Text,
  useConfirm,
  useMessage,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { adminApi, type PendingUser } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { EMPTY, formatDate, fullName, levelTermLabel, plural, roleLabel } from '@/lib/format';

const idLabel = (user: PendingUser) =>
  user.role === 'STUDENT'
    ? user.student_id !== undefined && user.student_id !== null
      ? `Student ID ${user.student_id}`
      : 'No student ID'
    : user.employee_id
      ? `Employee ID ${user.employee_id}`
      : 'No employee ID';

/** A student just approved: approving does not put them in a semester, so say where to add them. */
type Approved = { id: string; name: string; semester: { id: string; label: string } | null };

/** /admin/approvals: sign-ups waiting for approval, approve or reject each. */
export default function AdminApprovals() {
  const { isDesktop } = useBreakpoint();
  const confirm = useConfirm();
  const message = useMessage();
  const list = useLoad(() => adminApi.pendingUsers().then((r) => r.users), []);
  // Active semesters, to point at the one matching an approved student's level and term.
  const semesters = useLoad(() => adminApi.semesters('active').then((r) => r.semesters).catch(() => []), []);
  const [busy, setBusy] = React.useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [approved, setApproved] = React.useState<Approved[]>([]);

  const drop = (user: PendingUser) => list.setData((rows) => (rows ? rows.filter((row) => row.id !== user.id) : rows));

  async function approve(user: PendingUser) {
    setBusy({ id: user.id, action: 'approve' });
    try {
      await adminApi.approveUser(user.id);
      drop(user);
      message.success(`${fullName(user)} is approved and can sign in now.`);
      if (user.role === 'STUDENT') {
        const match = (semesters.data ?? []).find(
          (semester) => semester.level === user.current_level && semester.semester === user.current_semester
        );
        const entry: Approved = { id: user.id, name: fullName(user), semester: match ? { id: match.id, label: match.label } : null };
        setApproved((current) => [entry, ...current.filter((row) => row.id !== user.id)].slice(0, 5));
      }
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setBusy(null);
    }
  }

  async function reject(user: PendingUser) {
    const name = fullName(user);
    const ok = await confirm({
      title: `Reject ${name}?`,
      message: `${user.email} cannot sign in. The account is kept as deleted, so the email and ID cannot sign up again; you can restore it from the ${user.role === 'TEACHER' ? 'Teachers' : 'Students'} page (Status: Deleted).`,
      confirmLabel: 'Reject sign-up',
      destructive: true,
    });
    if (!ok) return;
    setBusy({ id: user.id, action: 'reject' });
    try {
      await adminApi.rejectUser(user.id);
      drop(user);
      message.success(`${name}'s sign-up was rejected.`);
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setBusy(null);
    }
  }

  const actions = (user: PendingUser) => (
    <View className="flex-row flex-wrap justify-end gap-2">
      <Button
        label="Reject"
        variant="quiet"
        destructive
        icon={X}
        compact
        accessibilityLabel={`Reject ${fullName(user)}`}
        loading={busy?.id === user.id && busy.action === 'reject'}
        disabled={busy?.id === user.id}
        onPress={() => reject(user)}
      />
      <Button
        label="Approve"
        variant="primary"
        icon={Check}
        compact
        accessibilityLabel={`Approve ${fullName(user)}`}
        loading={busy?.id === user.id && busy.action === 'approve'}
        disabled={busy?.id === user.id}
        onPress={() => approve(user)}
      />
    </View>
  );

  const columns: Column<PendingUser>[] = [
    { key: 'name', title: 'Name', flex: 2.2, render: (row) => <TwoLines main={fullName(row)} sub={row.email} /> },
    { key: 'role', title: 'Role', width: 96, render: (row) => <Pill label={roleLabel(row.role)} tone={row.role === 'TEACHER' ? 'info' : 'primary'} /> },
    {
      key: 'id',
      title: 'ID',
      flex: 1.3,
      render: (row) => (row.role === 'STUDENT' ? String(row.student_id ?? EMPTY) : row.employee_id || EMPTY),
    },
    {
      key: 'level',
      title: 'Level and term',
      flex: 1.3,
      render: (row) => (row.role === 'STUDENT' ? levelTermLabel(row.current_level, row.current_semester) : EMPTY),
    },
    { key: 'joined', title: 'Signed up', width: 112, render: (row) => formatDate(row.date_joined) },
    { key: 'actions', title: '', width: 228, align: 'right', render: actions },
  ];

  return (
    <Page>
      <PageHeader
        title="Approvals"
        meta={
          list.data
            ? list.data.length
              ? `${plural(list.data.length, 'sign-up')} waiting for approval, oldest first`
              : 'Nothing is waiting'
            : 'Sign-ups waiting for approval'
        }
      />
      {approved.map((row) => (
        <Notice
          key={row.id}
          tone="success"
          title={`${row.name} is approved`}
          message={
            row.semester
              ? `Add them to ${row.semester.label} so they see their courses and can check in.`
              : 'Add them to their semester on the Semesters page so they see their courses and can check in.'
          }
        >
          <Link
            href={(row.semester ? `/admin/semesters/${row.semester.id}?tab=students` : '/admin/semesters') as Href}
            asChild
          >
            <Button label={row.semester ? `Open ${row.semester.label}` : 'Open Semesters'} icon={GraduationCap} compact />
          </Link>
        </Notice>
      ))}
      <Card padded={false} className="overflow-hidden">
        <LoadBlock state={list} loadingLabel="Loading sign-ups…">
          {(users) =>
            users.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="No sign-ups waiting"
                message="When students or teachers sign up, they show here. They can sign in once you approve them."
              />
            ) : isDesktop ? (
              <DataTable label="Sign-ups waiting for approval" columns={columns} rows={users} rowKey={(row) => row.id} />
            ) : (
              <View role="list" accessibilityLabel="Sign-ups waiting for approval">
                {users.map((user, index) => (
                  <View key={user.id} role="listitem">
                    <ListRow
                      divider={index > 0}
                      title={fullName(user)}
                      subtitle={`${roleLabel(user.role)} · ${idLabel(user)}`}
                    >
                      <Text variant="small" tone="muted">
                        {user.email}
                      </Text>
                      <Text variant="small" tone="muted">
                        {user.role === 'STUDENT' ? `${levelTermLabel(user.current_level, user.current_semester)} · ` : ''}
                        Signed up {formatDate(user.date_joined)}
                      </Text>
                      <View className="mt-1">{actions(user)}</View>
                    </ListRow>
                  </View>
                ))}
              </View>
            )
          }
        </LoadBlock>
      </Card>
    </Page>
  );
}
