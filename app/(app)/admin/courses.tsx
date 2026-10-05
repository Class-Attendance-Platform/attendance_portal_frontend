import { BookOpen, BookPlus, Check, RotateCcw, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useLoad } from '@/components/admin/hooks';
import { creditOptions, DEFAULT_CREDITS } from '@/components/admin/options';
import { fieldError, FilterBar, FilterItem, FormError, LoadBlock, ResponsiveList } from '@/components/admin/parts';
import { FieldCell, FieldRow } from '@/components/admin/student-dialogs';
import { Page } from '@/components/layout/Page';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  SearchField,
  Select,
  Text,
  TextField,
  useConfirm,
  useMessage,
  type Column,
} from '@/components/ui';
import { adminApi, configApi, type ApiError, type Course, type PersonStatus, type UpdateCourseBody } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { formatCredits, plural } from '@/lib/format';

const STATUS_OPTIONS: { label: string; value: PersonStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Deleted', value: 'deleted' },
];

type CourseForm = { code: string; title: string; credits: string; content: string };

/** The credit values from the server (GET /config/credits/), or the usual ones. */
function useCredits(): string[] {
  const [credits, setCredits] = React.useState(DEFAULT_CREDITS);
  React.useEffect(() => {
    let alive = true;
    configApi
      .credits()
      .then((result) => {
        const values = Object.keys(result.revCreditMap ?? {});
        if (alive && values.length) setCredits(values.sort());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return credits;
}

function CourseDialog({
  open,
  course,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean;
  /** null: add a course. */
  course: Course | null;
  onClose: () => void;
  onSaved: (course: Course, created: boolean) => void;
  onDelete: (course: Course) => void;
}) {
  const message = useMessage();
  const credits = useCredits();
  const [form, setForm] = React.useState<CourseForm>({ code: '', title: '', credits: 'CREDIT_3_00', content: '' });
  const [missing, setMissing] = React.useState<Partial<Record<keyof CourseForm, string>>>({});
  const [error, setError] = React.useState<ApiError | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      course
        ? { code: course.code, title: course.title, credits: course.credits, content: course.content ?? '' }
        : { code: '', title: '', credits: 'CREDIT_3_00', content: '' }
    );
    setMissing({});
    setError(null);
  }, [open, course]);

  const set = (key: keyof CourseForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    const problems: Partial<Record<keyof CourseForm, string>> = {};
    if (!form.code.trim()) problems.code = 'Enter the course code, e.g. CSE301.';
    if (!form.title.trim()) problems.title = 'Enter the course title.';
    setMissing(problems);
    if (Object.keys(problems).length) return;
    const values = { code: form.code.trim(), title: form.title.trim(), credits: form.credits, content: form.content.trim() };
    setSaving(true);
    setError(null);
    try {
      if (course) {
        const changes: UpdateCourseBody = {};
        (Object.keys(values) as (keyof typeof values)[]).forEach((key) => {
          if (values[key] !== (course[key] ?? '')) changes[key] = values[key];
        });
        if (!Object.keys(changes).length) {
          message.info('Nothing was changed.');
          onClose();
          return;
        }
        const result = await adminApi.updateCourse(course.id, changes);
        onSaved(result.course, false);
        message.success(`Saved ${result.course.code}.`);
      } else {
        const result = await adminApi.createCourse(values);
        onSaved(result.course, true);
        message.success(`Added ${result.course.code}. Teach it in a semester from the semester's Courses tab.`);
      }
      onClose();
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const err = (key: keyof CourseForm) => missing[key] ?? fieldError(error, key);
  const hasFieldError = !!error && ['code', 'title', 'credits', 'content'].some((key) => error.field(key));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={course ? 'Edit course' : 'Add course'}
      dismissable={!saving}
      actions={
        <>
          {course ? (
            <View className="mr-auto">
              <Button label="Delete course" variant="quiet" destructive icon={Trash2} disabled={saving} onPress={() => onDelete(course)} />
            </View>
          ) : null}
          <Button label="Cancel" onPress={onClose} disabled={saving} />
          <Button label={course ? 'Save changes' : 'Add course'} variant="primary" icon={course ? Check : BookPlus} loading={saving} onPress={save} />
        </>
      }
    >
      <View className="gap-4">
        <FieldRow>
          <FieldCell>
            <TextField
              label="Code"
              required
              value={form.code}
              onChangeText={set('code')}
              error={err('code')}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="CSE301"
            />
          </FieldCell>
          <FieldCell>
            <Select label="Credits" value={form.credits} options={creditOptions(credits)} onChange={set('credits')} error={err('credits')} />
          </FieldCell>
        </FieldRow>
        <TextField label="Title" required value={form.title} onChangeText={set('title')} error={err('title')} placeholder="Software Engineering" />
        <TextField
          label="Description"
          value={form.content}
          onChangeText={set('content')}
          error={err('content')}
          multiline
          numberOfLines={3}
          inputStyle={{ minHeight: 72, textAlignVertical: 'top' }}
          hint="Optional."
        />
        {hasFieldError ? null : <FormError error={error} />}
      </View>
    </Dialog>
  );
}

/** /admin/courses: the department's courses; add, edit, delete and restore. */
export default function AdminCourses() {
  const confirm = useConfirm();
  const message = useMessage();
  const [status, setStatus] = React.useState<PersonStatus>('active');
  const [search, setSearch] = React.useState('');
  const list = useLoad(() => adminApi.courses(status).then((r) => r.courses), [status]);
  const [dialog, setDialog] = React.useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [restoring, setRestoring] = React.useState<string | null>(null);

  const needle = search.trim().toLowerCase();
  const visible = (list.data ?? []).filter(
    (course) => !needle || course.code.toLowerCase().includes(needle) || course.title.toLowerCase().includes(needle)
  );

  async function remove(course: Course) {
    setDialog({ open: false, course: null });
    const ok = await confirm({
      title: `Delete ${course.code}?`,
      message: `${course.title} is hidden from teachers, students and every semester. Its attendance is kept, and you can restore it later.`,
      confirmLabel: 'Delete course',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteCourse(course.id);
      list.setData((rows) => (rows ? rows.filter((row) => row.id !== course.id) : rows));
      message.success(`${course.code} was deleted.`);
    } catch (caught) {
      message.error(toApiError(caught).message);
    }
  }

  async function restore(course: Course) {
    setRestoring(course.id);
    try {
      await adminApi.restoreCourse(course.id);
      list.setData((rows) => (rows ? rows.filter((row) => row.id !== course.id) : rows));
      message.success(`${course.code} was restored.`);
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setRestoring(null);
    }
  }

  const deletedView = status === 'deleted';
  const restoreButton = (course: Course) => (
    <Button
      label="Restore"
      icon={RotateCcw}
      compact
      loading={restoring === course.id}
      accessibilityLabel={`Restore ${course.code}`}
      onPress={() => restore(course)}
    />
  );
  const columns: Column<Course>[] = [
    { key: 'code', title: 'Code', width: 120, render: (row) => <Text weight="semibold">{row.code}</Text> },
    { key: 'title', title: 'Title', flex: 3 },
    { key: 'credits', title: 'Credits', width: 90, align: 'right', render: (row) => formatCredits(row.credits) },
    ...(deletedView ? [{ key: 'restore', title: '', width: 130, align: 'right' as const, render: restoreButton }] : []),
  ];

  return (
    <Page>
      <PageHeader
        title="Courses"
        meta={list.data ? plural(list.data.length, deletedView ? 'deleted course' : 'course') : 'Courses of the department'}
        actions={<Button label="Add course" variant="primary" icon={BookPlus} onPress={() => setDialog({ open: true, course: null })} />}
      />

      <FilterBar>
        <FilterItem grow>
          <SearchField label="Search courses" placeholder="Search by code or title" value={search} onChangeText={setSearch} />
        </FilterItem>
        <FilterItem>
          <Select label="Status" hideLabel value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </FilterItem>
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        <LoadBlock state={list} loadingLabel="Loading courses…">
          {(courses) =>
            courses.length === 0 ? (
              deletedView ? (
                <EmptyState title="No deleted courses" message="Courses you delete show here, so you can restore them." />
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  message="Add the department's courses. Then teach them in a semester from the semester's page."
                  action={{ label: 'Add course', icon: BookPlus, onPress: () => setDialog({ open: true, course: null }) }}
                />
              )
            ) : visible.length === 0 ? (
              <EmptyState
                title="No courses match"
                message="Try another code or title."
                action={{ label: 'Clear search', variant: 'secondary', onPress: () => setSearch('') }}
              />
            ) : (
              <ResponsiveList
                label="Courses"
                rows={visible}
                rowKey={(row) => row.id}
                columns={columns}
                onRowPress={deletedView ? undefined : (course) => setDialog({ open: true, course })}
                rowLabel={(row) => `${row.code}, ${row.title}. Open to edit.`}
                phoneRow={(row) => ({
                  title: `${row.code} · ${row.title}`,
                  subtitle: `${formatCredits(row.credits)} credits`,
                  right: deletedView ? restoreButton(row) : undefined,
                })}
              />
            )
          }
        </LoadBlock>
      </Card>

      <CourseDialog
        open={dialog.open}
        course={dialog.course}
        onClose={() => setDialog({ open: false, course: null })}
        onSaved={(course, created) =>
          list.setData((rows) => {
            if (!rows) return rows;
            if (!created) return rows.map((row) => (row.id === course.id ? course : row));
            return status === 'active' ? [...rows, course].sort((a, b) => a.code.localeCompare(b.code)) : rows;
          })
        }
        onDelete={remove}
      />
    </Page>
  );
}
