import { UserMinus, UserPlus, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  EmptyState,
  ListRow,
  LoadingState,
  Notice,
  Pill,
  SearchField,
  Select,
  Text,
  useConfirm,
  useMessage,
  type Column,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { adminApi, type AdminStudent, type ApiError, type RosterMember, type Semester, type UUID } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatDate, fullName, levelLabel, levelTermLabel, plural } from '@/lib/format';
import { useAppConfig, useDebounced, useLoad } from './hooks';
import { levelOptions } from './options';
import { FormError, LoadBlock, TwoLines } from './parts';

const joinedText = (member: RosterMember) => (member.joined_at ? formatDate(member.joined_at) : 'From the start');

/** Search students and pick several to add to the semester. */
function AddStudentsDialog({
  open,
  semester,
  currentIds,
  onClose,
  onAdded,
}: {
  open: boolean;
  semester: Semester;
  currentIds: Set<UUID>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const config = useAppConfig();
  const message = useMessage();
  const [search, setSearch] = React.useState('');
  const [level, setLevel] = React.useState(semester.level);
  const [picked, setPicked] = React.useState<Map<UUID, AdminStudent>>(new Map());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const query = useDebounced(search.trim(), 300);

  React.useEffect(() => {
    if (open) {
      setSearch('');
      setLevel(semester.level);
      setPicked(new Map());
      setError(null);
    }
  }, [open, semester.level]);

  const results = useLoad(
    () => (open ? adminApi.students({ search: query, level: level || undefined, status: 'active' }).then((r) => r.students) : Promise.resolve([])),
    [open, query, level]
  );
  // Former members of this semester ({profile id: left_at}): adding one back re-opens their old
  // membership, so classes held while they were away count as absent.
  const former = useLoad(
    () =>
      open
        ? adminApi
            .semesterStudents(semester.id, { includeLeft: true })
            .then((r) => new Map(r.students.filter((member) => member.left_at).map((member) => [member.profile_id, member.left_at as string])))
        : Promise.resolve(new Map<UUID, string>()),
    [open, semester.id]
  );
  const leftOn = former.data ?? new Map<UUID, string>();
  const pickedFormer = [...picked.keys()].filter((id) => leftOn.has(id)).length;

  const toggle = (student: AdminStudent) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(student.id)) next.delete(student.id);
      else next.set(student.id, student);
      return next;
    });

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.addSemesterStudents(semester.id, [...picked.keys()]);
      const parts = [
        result.added ? `Added ${plural(result.added, 'student')}` : null,
        result.rejoined ? `${plural(result.rejoined, 'former member')} came back` : null,
        result.already_in ? `${result.already_in} already in` : null,
      ].filter(Boolean);
      const away = result.rejoined ? ' Classes held while they were away count as absent.' : '';
      message.success(parts.length ? `${parts.join(', ')}.${away}` : result.message);
      onAdded();
      onClose();
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  // Current members are left out: there is nothing to add for them.
  const found = results.data ?? [];
  const rows = found.filter((student) => !currentIds.has(student.id));
  const hidden = found.length - rows.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add students"
      description={`To ${semester.label}.`}
      size="lg"
      dismissable={!saving}
      actions={
        <>
          <Button label="Cancel" onPress={onClose} disabled={saving} />
          <Button
            label={picked.size ? `Add ${plural(picked.size, 'student')}` : 'Add students'}
            variant="primary"
            icon={UserPlus}
            disabled={!picked.size}
            loading={saving}
            onPress={add}
          />
        </>
      }
    >
      <View className="gap-3">
        <Notice
          tone="info"
          message="If this semester has already held classes, students added for the first time count from today: earlier classes are not counted against them."
        />
        {pickedFormer ? (
          <Notice
            tone="warn"
            title={`${plural(pickedFormer, 'former member')} chosen`}
            message="They come back with their old record: classes held while they were away count as absent. Their teacher can mark those days present."
          />
        ) : null}
        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[220px] flex-1">
            <SearchField label="Search students" placeholder="Name, email or student ID" value={search} onChangeText={setSearch} />
          </View>
          <View className="min-w-[160px]">
            <Select
              label="Level"
              hideLabel
              value={level}
              options={[{ label: 'All levels', value: '' }, ...levelOptions(config)]}
              onChange={setLevel}
            />
          </View>
        </View>
        <Text variant="small" tone="muted">
          {picked.size ? `${plural(picked.size, 'student')} chosen.` : 'Choose the students to add.'}
          {level ? ` Showing ${levelLabel(level)} students; choose "All levels" to see everyone.` : ''}
          {hidden ? ` ${plural(hidden, 'student')} already in this semester ${hidden === 1 ? 'is' : 'are'} not shown.` : ''}
        </Text>
        {results.data === null && results.loading ? (
          <LoadingState label="Searching…" />
        ) : results.error ? (
          <View className="gap-2">
            <Notice tone="error" message={results.error.message} />
            <Button label="Try again" compact onPress={() => void results.reload()} />
          </View>
        ) : rows.length === 0 ? (
          <EmptyState
            title={hidden ? 'Everyone found is already in' : 'No students found'}
            message="Try another search or level. New students can be added on the Students page."
          />
        ) : (
          <View role="list" accessibilityLabel="Students to add" className="rounded-control border border-border">
            {rows.map((student, index) => {
              const left = leftOn.get(student.id);
              const where = left
                ? `Left this semester ${formatDate(left)}`
                : student.semester
                  ? `In ${student.semester.label}`
                  : 'Not in an active semester';
              return (
                <View key={student.id} role="listitem" className={index > 0 ? 'border-t border-border px-3' : 'px-3'}>
                  <Checkbox
                    checked={picked.has(student.id)}
                    onChange={() => toggle(student)}
                    label={`${fullName(student)} · ${student.student_id}`}
                    description={`${levelTermLabel(student.current_level, student.current_semester)} · ${where}${student.is_verified ? '' : ' · Waiting for approval'}`}
                    className="py-1.5"
                  />
                </View>
              );
            })}
          </View>
        )}
        <FormError error={error} />
      </View>
    </Dialog>
  );
}

/** The semester's students: joined and left dates, add, remove, former members. */
export function SemesterRoster({ semester, onChanged }: { semester: Semester; onChanged: () => void }) {
  const { isDesktop } = useBreakpoint();
  const confirm = useConfirm();
  const message = useMessage();
  // A finished semester's class list is everyone who was in it: show former members there.
  const [includeLeft, setIncludeLeft] = React.useState(!semester.is_active);
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<UUID | null>(null);
  const roster = useLoad(
    () => adminApi.semesterStudents(semester.id, { includeLeft }).then((r) => r.students),
    [semester.id, includeLeft]
  );
  const readOnly = semester.deleted;
  const members = roster.data ?? [];
  const current = members.filter((member) => !member.left_at);
  const currentIds = new Set(current.map((member) => member.profile_id));

  async function remove(member: RosterMember) {
    const ok = await confirm({
      title: `Remove ${member.name}?`,
      message:
        'They leave this semester from today (from tomorrow if a class was held today). Their attendance so far stays in the history. You can add them again later, but classes held while they are away then count as absent.',
      confirmLabel: 'Remove student',
      destructive: true,
    });
    if (!ok) return;
    setRemoving(member.profile_id);
    try {
      await adminApi.removeSemesterStudents(semester.id, [member.profile_id]);
      message.success(`${member.name} was removed from ${semester.label}.`);
      await roster.reload();
      onChanged();
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setRemoving(null);
    }
  }

  const removeButton = (member: RosterMember) =>
    member.left_at || readOnly ? null : (
      <Button
        label="Remove"
        variant="quiet"
        destructive
        compact
        icon={UserMinus}
        accessibilityLabel={`Remove ${member.name}`}
        loading={removing === member.profile_id}
        onPress={() => remove(member)}
      />
    );

  const toolbar = (
    <>
      <Checkbox checked={includeLeft} onChange={setIncludeLeft} label="Show former members" />
      {readOnly ? null : <Button label="Add students" variant="primary" icon={UserPlus} onPress={() => setAdding(true)} />}
    </>
  );

  const columns: Column<RosterMember>[] = [
    { key: 'student_id', title: 'Student ID', width: 104, render: (row) => <Text tabular>{String(row.student_id)}</Text> },
    { key: 'name', title: 'Name', flex: 2.2, render: (row) => <TwoLines main={row.name} sub={row.email} /> },
    { key: 'joined', title: 'Joined', flex: 1, render: joinedText },
    {
      key: 'left',
      title: 'Status',
      flex: 1.1,
      render: (row) =>
        row.left_at ? <Pill label={`Left ${formatDate(row.left_at)}`} tone="neutral" /> : <Pill label="Current" tone="present" />,
    },
    { key: 'remove', title: '', width: 124, align: 'right', render: (row) => removeButton(row) },
  ];

  return (
    <Card
      title="Students"
      titleNote={roster.data ? `(${current.length} current${includeLeft ? `, ${members.length - current.length} former` : ''})` : undefined}
      padded={false}
      actions={isDesktop ? toolbar : undefined}
    >
      {isDesktop ? null : <View className="flex-row flex-wrap items-center gap-3 px-4 pt-3">{toolbar}</View>}
      <View className="mt-3">
        <LoadBlock state={roster} loadingLabel="Loading students…">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title={includeLeft ? 'No students yet' : 'No current students'}
                message={
                  readOnly
                    ? 'This semester is deleted.'
                    : 'Add the students of this level and term. Promoting a previous semester also adds them here.'
                }
                action={readOnly ? undefined : { label: 'Add students', icon: UserPlus, onPress: () => setAdding(true) }}
              />
            ) : isDesktop ? (
              <DataTable label="Students" columns={columns} rows={rows} rowKey={(row) => row.profile_id} />
            ) : (
              <View role="list" accessibilityLabel="Students">
                {rows.map((row, index) => (
                  <View key={row.profile_id} role="listitem">
                    <ListRow
                      divider={index > 0}
                      title={row.name}
                      subtitle={`${row.student_id} · ${row.joined_at ? `Joined ${formatDate(row.joined_at)}` : 'From the start'}`}
                      right={row.left_at ? <Pill label={`Left ${formatDate(row.left_at)}`} tone="neutral" /> : removeButton(row)}
                    />
                  </View>
                ))}
              </View>
            )
          }
        </LoadBlock>
      </View>
      {readOnly ? null : (
        <AddStudentsDialog
          open={adding}
          semester={semester}
          currentIds={currentIds}
          onClose={() => setAdding(false)}
          onAdded={() => {
            void roster.reload();
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
