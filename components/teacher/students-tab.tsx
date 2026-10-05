import { router } from 'expo-router';
import { Check, Minus, SearchX, TriangleAlert, Users } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ListRow } from '@/components/ui/list-row';
import { Pill } from '@/components/ui/pill';
import { SearchField } from '@/components/ui/search-field';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { CourseStudent } from '@/lib/api/teacher';
import type { UUID } from '@/lib/api/types';
import { formatDate, formatPercent } from '@/lib/format';
import { studentHref } from './labels';

/** "Joined 18 Sep 2026" / "Left 01 Oct 2026" for students who were not there all semester. */
export function membershipNote(student: { joined_at: string | null; left_at: string | null }): string | null {
  const parts = [];
  if (student.joined_at) parts.push(`Joined ${formatDate(student.joined_at)}`);
  if (student.left_at) parts.push(`Left ${formatDate(student.left_at)}`);
  return parts.length ? parts.join(' · ') : null;
}

function FaceStatus({ registered }: { registered: boolean }) {
  return registered ? (
    <Pill label="Registered" tone="present" icon={Check} />
  ) : (
    <Pill label="Not yet" icon={Minus} />
  );
}

function Percent({ student, minPercent }: { student: CourseStudent; minPercent: number }) {
  const low = student.percent !== null && student.percent < minPercent;
  return (
    <View className="flex-row items-center gap-1.5">
      {low ? <Icon as={TriangleAlert} size={14} color="warn" /> : null}
      <Text weight="bold" tabular tone={low ? 'warn' : 'default'} accessibilityLabel={low ? `${formatPercent(student.percent)}, below ${minPercent}%` : undefined}>
        {formatPercent(student.percent)}
      </Text>
    </View>
  );
}

export type StudentsTabProps = {
  courseInfoId: UUID;
  students: CourseStudent[];
  minPercent: number;
};

/** ?tab=students: the class list with each student's numbers; a row opens the student. */
export function StudentsTab({ courseInfoId, students, minPercent }: StudentsTabProps) {
  const { isDesktop } = useBreakpoint();
  const [search, setSearch] = React.useState('');
  const [belowOnly, setBelowOnly] = React.useState(false);

  const query = search.trim().toLowerCase();
  const rows = students.filter((student) => {
    if (belowOnly && !(student.percent !== null && student.percent < minPercent)) return false;
    if (!query) return true;
    return student.name.toLowerCase().includes(query) || String(student.student_id).includes(query);
  });
  const belowCount = students.filter((student) => student.percent !== null && student.percent < minPercent).length;

  const open = (student: CourseStudent) => router.push(studentHref(courseInfoId, student.profile_id));

  if (!students.length) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="No students in this course yet"
          message="An admin adds students to the semester. They show here once they are added."
        />
      </Card>
    );
  }

  const columns: Column<CourseStudent>[] = [
    { key: 'student_id', title: 'Student ID', width: 110, render: (row) => String(row.student_id) },
    {
      key: 'name',
      title: 'Name',
      flex: 2,
      render: (row) => {
        const note = membershipNote(row);
        return (
          <View className="gap-0.5">
            <Text weight="semibold">{row.name}</Text>
            {note ? (
              <Text variant="small" tone="muted">
                {note}
              </Text>
            ) : null}
          </View>
        );
      },
    },
    { key: 'attended', title: 'Attended', flex: 1, align: 'right', render: (row) => `${row.attended} / ${row.held}` },
    { key: 'percent', title: 'Attendance', flex: 1, align: 'right', render: (row) => <Percent student={row} minPercent={minPercent} /> },
    { key: 'face', title: 'Face', width: 130, render: (row) => <FaceStatus registered={row.face_registered} /> },
  ];

  const empty = (
    <EmptyState
      icon={SearchX}
      title="No students match"
      message={belowOnly && !query ? `No one is below ${minPercent}%.` : 'Try another name or student ID.'}
    />
  );

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap items-center gap-x-5 gap-y-2">
        <View className="min-w-[240px] flex-1" style={{ maxWidth: 420 }}>
          <SearchField label="Search students" placeholder="Search by name or student ID" value={search} onChangeText={setSearch} />
        </View>
        <Checkbox checked={belowOnly} onChange={setBelowOnly} label={`Below ${minPercent}% only (${belowCount})`} />
      </View>

      <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
        {rows.length === students.length ? `${students.length} students` : `Showing ${rows.length} of ${students.length} students`}
      </Text>

      <Card padded={false}>
        {isDesktop ? (
          <DataTable
            label="Students"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.profile_id}
            onRowPress={open}
            rowLabel={(row) => `Open ${row.name}`}
            empty={empty}
          />
        ) : rows.length === 0 ? (
          empty
        ) : (
          rows.map((student, index) => {
            const note = membershipNote(student);
            return (
              <ListRow
                key={student.profile_id}
                divider={index > 0}
                title={student.name}
                subtitle={`${student.student_id} · ${student.attended} of ${student.held} classes${note ? ` · ${note}` : ''}`}
                accessibilityLabel={`Open ${student.name}`}
                onPress={() => open(student)}
                right={
                  <View className="items-end gap-1">
                    <Percent student={student} minPercent={minPercent} />
                    <Text variant="caption" tone="muted">
                      {student.face_registered ? 'Face registered' : 'No face yet'}
                    </Text>
                  </View>
                }
              />
            );
          })
        )}
      </Card>
    </View>
  );
}
