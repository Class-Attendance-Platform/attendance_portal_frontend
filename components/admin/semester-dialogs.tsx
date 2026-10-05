import { CalendarPlus, Check, X } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button, DateField, Dialog, Notice, Select, TextField, useConfirm, useMessage } from '@/components/ui';
import { ADMIN_ERRORS, adminApi, type ApiError, type ISODate, type Semester } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { compareISODate } from '@/lib/dates';
import { formatDate, levelLabel } from '@/lib/format';
import { useAppConfig } from './hooks';
import { cleanSession, currentSession, levelOptions, termOptions } from './options';
import { fieldError, FormError } from './parts';
import { FieldCell, FieldRow } from './student-dialogs';

/** "24 Aug 2026 – 16 Dec 2026", "From 24 Aug 2026", "No dates set". */
export function semesterDates(semester: { start_date: ISODate | null; end_date: ISODate | null }): string {
  const { start_date: start, end_date: end } = semester;
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return 'No dates set';
}

/** A date that may stay empty, with a "Clear" button. */
export function OptionalDateField({
  label,
  value,
  onChange,
  error,
  minDate,
}: {
  label: string;
  value: ISODate | null;
  onChange: (value: ISODate | null) => void;
  error?: string;
  minDate?: ISODate;
}) {
  return (
    <View className="flex-row items-start gap-2">
      <View className="flex-1">
        <DateField label={label} value={value} onChange={onChange} error={error} minDate={minDate} placeholder="Not set" hint="Optional." />
      </View>
      {value ? (
        <View className="pt-7">
          <Button label="Clear" variant="quiet" compact icon={X} accessibilityLabel={`Clear ${label.toLowerCase()}`} onPress={() => onChange(null)} />
        </View>
      ) : null}
    </View>
  );
}

/** The "Level 3 already has an active semester" problem, said plainly. */
export function LevelTakenNotice({ error, level }: { error: ApiError; level: string }) {
  return (
    <Notice
      tone="warn"
      title={level ? `${levelLabel(level)} already has an active semester` : error.message}
      message="A level can have only one active semester at a time. Finish the running one first (or promote its students), then try again."
      live
    />
  );
}

type Form = { level: string; semester: string; session: string; start_date: ISODate | null; end_date: ISODate | null };

/** Create a semester, or edit one's session and dates (level and term never change). */
export function SemesterFormDialog({
  open,
  semester,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null: create. */
  semester: Semester | null;
  onClose: () => void;
  onSaved: (semester: Semester, created: boolean) => void;
}) {
  const config = useAppConfig();
  const message = useMessage();
  const [form, setForm] = React.useState<Form>({ level: '', semester: '', session: '', start_date: null, end_date: null });
  const [missing, setMissing] = React.useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = React.useState<ApiError | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      semester
        ? { level: semester.level, semester: semester.semester, session: semester.session, start_date: semester.start_date, end_date: semester.end_date }
        : { level: '', semester: '', session: currentSession(), start_date: null, end_date: null }
    );
    setMissing({});
    setError(null);
  }, [open, semester]);

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    const problems: Partial<Record<keyof Form, string>> = {};
    if (!form.level) problems.level = 'Choose the level.';
    if (!form.semester) problems.semester = 'Choose the term.';
    if (!form.session.trim()) problems.session = 'Enter the session, e.g. 2025-26.';
    if (form.start_date && form.end_date && compareISODate(form.end_date, form.start_date) < 0) {
      problems.end_date = 'The end date cannot be before the start date.';
    }
    setMissing(problems);
    if (Object.keys(problems).length) return;
    setSaving(true);
    setError(null);
    const session = cleanSession(form.session);
    try {
      if (semester) {
        const result = await adminApi.updateSemester(semester.id, { session, start_date: form.start_date, end_date: form.end_date });
        onSaved(result.semester, false);
        message.success(`Saved ${result.semester.label}.`);
      } else {
        const result = await adminApi.createSemester({
          level: form.level,
          semester: form.semester,
          session,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        onSaved(result.semester, true);
        message.success(`Created ${result.semester.label}. Now add its students and courses.`);
      }
      onClose();
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const err = (key: keyof Form) => missing[key] ?? fieldError(error, key);
  const levelTaken = error?.code === ADMIN_ERRORS.levelHasActiveSemester;
  const hasFieldError = !!error && ['level', 'semester', 'session', 'start_date', 'end_date'].some((key) => error.field(key));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={semester ? 'Edit semester' : 'New semester'}
      description={
        semester
          ? `${semester.label}. Level and term cannot change.`
          : 'One semester per level and term. Its class group is made with it; add students and courses next.'
      }
      dismissable={!saving}
      actions={
        <>
          <Button label="Cancel" onPress={onClose} disabled={saving} />
          <Button
            label={semester ? 'Save changes' : 'Create semester'}
            variant="primary"
            icon={semester ? Check : CalendarPlus}
            loading={saving}
            onPress={save}
          />
        </>
      }
    >
      <View className="gap-4">
        {semester ? null : (
          <FieldRow>
            <FieldCell>
              <Select label="Level" required value={form.level || null} options={levelOptions(config)} onChange={set('level')} error={err('level')} />
            </FieldCell>
            <FieldCell>
              <Select label="Term" required value={form.semester || null} options={termOptions(config)} onChange={set('semester')} error={err('semester')} />
            </FieldCell>
          </FieldRow>
        )}
        <TextField
          label="Session"
          required
          value={form.session}
          onChangeText={set('session')}
          error={err('session')}
          placeholder="2025-26"
          hint="The academic year, like 2025-26."
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FieldRow>
          <FieldCell>
            <OptionalDateField label="Start date" value={form.start_date} onChange={set('start_date')} error={err('start_date')} />
          </FieldCell>
          <FieldCell>
            <OptionalDateField
              label="End date"
              value={form.end_date}
              onChange={set('end_date')}
              error={err('end_date')}
              minDate={form.start_date ?? undefined}
            />
          </FieldCell>
        </FieldRow>
        {levelTaken && error ? <LevelTakenNotice error={error} level={form.level} /> : hasFieldError ? null : <FormError error={error} />}
      </View>
    </Dialog>
  );
}

/**
 * Finish, reopen, delete and restore with the questions and messages around them. Returns the
 * updated semester (or null when nothing happened).
 */
export function useSemesterActions() {
  const confirm = useConfirm();
  const message = useMessage();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(key: string, action: () => Promise<Semester | null>) {
    setBusy(key);
    try {
      return await action();
    } catch (caught) {
      const error = toApiError(caught);
      message.error(
        error.code === ADMIN_ERRORS.levelHasActiveSemester
          ? // "Level 3 already has an active semester. Finish it first." → say which one to finish
            `${error.message.replace(/\s*Finish it first\.?\s*$/, '')} Finish that one first, then reopen this one.`
          : error.message
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  const finish = async (semester: Semester) => {
    const ok = await confirm({
      title: `Finish ${semester.label}?`,
      message:
        'Teachers can no longer start live or face sessions for its courses. Corrections and roll calls still work, and its numbers stay. You can reopen it later.',
      confirmLabel: 'Finish semester',
    });
    if (!ok) return null;
    return run(`finish-${semester.id}`, async () => {
      const result = await adminApi.finishSemester(semester.id);
      message.success(`${semester.label} is finished.`);
      return result.semester ?? { ...semester, is_active: false };
    });
  };

  const reopen = async (semester: Semester) => {
    const ok = await confirm({
      title: `Reopen ${semester.label}?`,
      message: 'It becomes active again: teachers can take live and face attendance for its courses.',
      confirmLabel: 'Reopen semester',
    });
    if (!ok) return null;
    return run(`reopen-${semester.id}`, async () => {
      const result = await adminApi.reopenSemester(semester.id);
      message.success(`${semester.label} is active again.`);
      return result.semester ?? { ...semester, is_active: true };
    });
  };

  const remove = async (semester: Semester) => {
    const ok = await confirm({
      title: `Delete ${semester.label}?`,
      message:
        'It is finished and hidden from every list, for teachers and students too. Its attendance history is kept, and you can restore it (Show: Deleted).',
      confirmLabel: 'Delete semester',
      destructive: true,
    });
    if (!ok) return null;
    return run(`delete-${semester.id}`, async () => {
      await adminApi.deleteSemester(semester.id);
      message.success(`${semester.label} was deleted.`);
      return { ...semester, deleted: true, is_active: false };
    });
  };

  const restore = (semester: Semester) =>
    run(`restore-${semester.id}`, async () => {
      const result = await adminApi.restoreSemester(semester.id);
      message.success(`${semester.label} was restored as finished. Reopen it if classes continue.`);
      return result.semester ?? { ...semester, deleted: false, is_active: false };
    });

  return { busy, finish, reopen, remove, restore };
}

/** Small "Active" / "Finished" / "Deleted" pill text. */
export function semesterState(semester: Pick<Semester, 'is_active' | 'deleted'>): { label: string; tone: 'present' | 'neutral' | 'absent' } {
  if (semester.deleted) return { label: 'Deleted', tone: 'absent' };
  return semester.is_active ? { label: 'Active', tone: 'present' } : { label: 'Finished', tone: 'neutral' };
}
