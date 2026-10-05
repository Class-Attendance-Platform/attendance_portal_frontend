import { BookOpen, BookPlus, Check, Trash2, UserCog } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ListRow,
  Notice,
  Pill,
  Select,
  Text,
  useConfirm,
  useMessage,
  type Column,
  type SelectOption,
} from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { adminApi, type AdminTeacher, type ApiError, type Course, type Semester, type SemesterCourse, type UUID } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatCredits, fullName } from '@/lib/format';
import { useLoad } from './hooks';
import { fieldError, FormError, LoadBlock, TwoLines } from './parts';

const NO_TEACHER = '';

function teacherOptions(teachers: AdminTeacher[]): SelectOption<string>[] {
  return [
    { label: 'No teacher yet', value: NO_TEACHER, description: 'Choose one later' },
    ...teachers
      .filter((teacher) => teacher.is_verified && !teacher.deleted)
      .map((teacher) => ({
        label: fullName(teacher),
        value: teacher.id,
        description: [teacher.employee_id, `${teacher.course_count} course${teacher.course_count === 1 ? '' : 's'}`]
          .filter(Boolean)
          .join(' · '),
      })),
  ];
}

/** Choose a course (and teacher) to teach in the semester, or change a course's teacher. */
function CourseAssignDialog({
  open,
  semester,
  editing,
  taughtCourseIds,
  onClose,
  onSaved,
}: {
  open: boolean;
  semester: Semester;
  /** Set: change this course's teacher. Null: add a course. */
  editing: SemesterCourse | null;
  taughtCourseIds: Set<UUID>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const message = useMessage();
  const [courseId, setCourseId] = React.useState<string | null>(null);
  const [teacherId, setTeacherId] = React.useState<string>(NO_TEACHER);
  const [missing, setMissing] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [saving, setSaving] = React.useState(false);

  const choices = useLoad(
    async () => {
      if (!open) return null;
      const [courses, teachers] = await Promise.all([
        editing ? Promise.resolve({ courses: [] as Course[] }) : adminApi.courses('active'),
        adminApi.teachers({ status: 'active' }),
      ]);
      return { courses: courses.courses, teachers: teachers.teachers };
    },
    [open, editing]
  );

  React.useEffect(() => {
    if (!open) return;
    setCourseId(null);
    setTeacherId(editing?.teacher?.id ?? NO_TEACHER);
    setMissing(null);
    setError(null);
  }, [open, editing]);

  async function save() {
    if (!editing && !courseId) {
      setMissing('Choose a course.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const teacher = teacherId === NO_TEACHER ? null : teacherId;
      if (editing) {
        if ((editing.teacher?.id ?? null) === teacher) {
          message.info('Nothing was changed.');
          onClose();
          return;
        }
        await adminApi.reassignTeacher(editing.course_info_id, teacher);
        message.success(teacher ? `${editing.course.code} has a new teacher.` : `${editing.course.code} has no teacher now.`);
      } else {
        const result = await adminApi.addSemesterCourse(semester.id, { course_id: courseId as UUID, teacher_id: teacher });
        message.success(result.message ?? 'Course added.');
      }
      onSaved();
      onClose();
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const courseOptions: SelectOption<string>[] = (choices.data?.courses ?? [])
    .filter((course) => !taughtCourseIds.has(course.id))
    .map((course) => ({ label: `${course.code} · ${course.title}`, value: course.id, description: `${formatCredits(course.credits)} credits` }));
  const courseError = missing ?? fieldError(error, 'course_id');
  const teacherError = fieldError(error, 'teacher_id');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Teacher of ${editing.course.code}` : 'Add a course'}
      description={editing ? editing.course.title : `Teach a course in ${semester.label}.`}
      dismissable={!saving}
      actions={
        <>
          <Button label="Cancel" onPress={onClose} disabled={saving} />
          <Button
            label={editing ? 'Save teacher' : 'Add course'}
            variant="primary"
            icon={editing ? Check : BookPlus}
            loading={saving}
            disabled={!choices.data}
            onPress={save}
          />
        </>
      }
    >
      {choices.data === null ? (
        choices.error ? (
          <View className="gap-2">
            <Notice tone="error" message={choices.error.message} />
            <Button label="Try again" compact onPress={() => void choices.reload()} />
          </View>
        ) : (
          <Text tone="muted">Loading courses and teachers…</Text>
        )
      ) : (
        <View className="gap-4">
          {editing ? null : courseOptions.length ? (
            <Select label="Course" required value={courseId} options={courseOptions} onChange={setCourseId} error={courseError} />
          ) : (
            <Notice tone="info" message="Every course is already taught in this semester. Add new courses on the Courses page." />
          )}
          <Select
            label="Teacher"
            value={teacherId}
            options={teacherOptions(choices.data.teachers)}
            onChange={setTeacherId}
            error={teacherError}
            hint={editing ? 'The new teacher sees all of this course’s attendance so far.' : undefined}
          />
          {courseError || teacherError ? null : <FormError error={error} />}
        </View>
      )}
    </Dialog>
  );
}

/** The courses taught in a semester: add one (with a teacher), change the teacher, remove. */
export function SemesterCourses({ semester, onChanged }: { semester: Semester; onChanged: () => void }) {
  const { isDesktop } = useBreakpoint();
  const confirm = useConfirm();
  const message = useMessage();
  const courses = useLoad(() => adminApi.semesterCourses(semester.id).then((r) => r.courses), [semester.id]);
  const [dialog, setDialog] = React.useState<{ open: boolean; editing: SemesterCourse | null }>({ open: false, editing: null });
  const [removing, setRemoving] = React.useState<UUID | null>(null);
  const readOnly = semester.deleted;
  const taught = new Set((courses.data ?? []).map((row) => row.course.id));

  async function remove(row: SemesterCourse) {
    const ok = await confirm({
      title: `Remove ${row.course.code} from this semester?`,
      message: 'Teachers and students no longer see it here. Its attendance is kept: adding the course again brings it back.',
      confirmLabel: 'Remove course',
      destructive: true,
    });
    if (!ok) return;
    setRemoving(row.course_info_id);
    try {
      await adminApi.deleteCourseInfo(row.course_info_id);
      message.success(`${row.course.code} was removed from ${semester.label}.`);
      await courses.reload();
      onChanged();
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setRemoving(null);
    }
  }

  const teacherCell = (row: SemesterCourse, prefix = false) =>
    row.teacher ? <Text>{prefix ? `Teacher: ${row.teacher.name}` : row.teacher.name}</Text> : <Pill label="No teacher yet" tone="warn" />;

  const buttons = (row: SemesterCourse) =>
    readOnly ? null : (
      <View className={isDesktop ? 'flex-row justify-end gap-2' : 'flex-row flex-wrap gap-2'}>
        <Button
          label="Change teacher"
          compact
          icon={UserCog}
          accessibilityLabel={`Change the teacher of ${row.course.code}`}
          onPress={() => setDialog({ open: true, editing: row })}
        />
        <Button
          label="Remove"
          variant="quiet"
          destructive
          compact
          icon={Trash2}
          accessibilityLabel={`Remove ${row.course.code}`}
          loading={removing === row.course_info_id}
          onPress={() => remove(row)}
        />
      </View>
    );

  const columns: Column<SemesterCourse>[] = [
    { key: 'course', title: 'Course', flex: 2.4, render: (row) => <TwoLines main={row.course.code} sub={row.course.title} /> },
    { key: 'credits', title: 'Credits', width: 80, align: 'right', render: (row) => formatCredits(row.course.credits) },
    { key: 'teacher', title: 'Teacher', flex: 1.6, render: (row) => teacherCell(row) },
    { key: 'actions', title: '', width: 296, align: 'right', render: buttons },
  ];

  return (
    <Card
      title="Courses"
      titleNote={courses.data ? `(${courses.data.length})` : undefined}
      padded={false}
      actions={readOnly ? undefined : <Button label="Add course" variant="primary" icon={BookPlus} onPress={() => setDialog({ open: true, editing: null })} />}
    >
      <View className="mt-3">
        <LoadBlock state={courses} loadingLabel="Loading courses…">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                message={readOnly ? 'This semester is deleted.' : 'Add the courses taught this semester and choose each one’s teacher.'}
                action={readOnly ? undefined : { label: 'Add course', icon: BookPlus, onPress: () => setDialog({ open: true, editing: null }) }}
              />
            ) : isDesktop ? (
              <DataTable label="Courses" columns={columns} rows={rows} rowKey={(row) => row.course_info_id} />
            ) : (
              <View role="list" accessibilityLabel="Courses">
                {rows.map((row, index) => (
                  <View key={row.course_info_id} role="listitem">
                    <ListRow
                      divider={index > 0}
                      title={`${row.course.code} · ${row.course.title}`}
                      subtitle={`${formatCredits(row.course.credits)} credits`}
                    >
                      <View className="items-start">{teacherCell(row, true)}</View>
                      {readOnly ? null : <View className="mt-1 items-start">{buttons(row)}</View>}
                    </ListRow>
                  </View>
                ))}
              </View>
            )
          }
        </LoadBlock>
      </View>
      {readOnly ? null : (
        <CourseAssignDialog
          open={dialog.open}
          semester={semester}
          editing={dialog.editing}
          taughtCourseIds={taught}
          onClose={() => setDialog({ open: false, editing: null })}
          onSaved={() => {
            void courses.reload();
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
