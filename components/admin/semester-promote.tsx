import { useRouter, type Href } from 'expo-router';
import { ArrowRight, GraduationCap } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button, Card, Checkbox, EmptyState, Icon, Notice, Select, Text, TextField, useConfirm, useMessage } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ADMIN_ERRORS, adminApi, semesterClashes, type ApiError, type ISODate, type PromoteBody, type Semester, type UUID } from '@/lib/api';
import { toApiError } from '@/lib/api/client';
import { compareISODate } from '@/lib/dates';
import { levelTermLabel, plural } from '@/lib/format';
import { useAppConfig, useLoad } from './hooks';
import { cleanSession, levelOptions, nextLevelTerm, termOptions } from './options';
import { ChoiceCards, fieldError, FormError, LoadBlock, SemesterClashNotice } from './parts';
import { chosenAfterLoad, keepChoice } from './rules';
import { LevelTakenNotice, OptionalDateField } from './semester-dialogs';
import { FieldCell, FieldRow } from './student-dialogs';

type Target = 'new' | 'existing';

/** Move students on to the next semester; the source is finished, its history kept. */
export function SemesterPromote({ semester }: { semester: Semester }) {
  const router = useRouter();
  const config = useAppConfig();
  const confirm = useConfirm();
  const message = useMessage();
  const { isDesktop } = useBreakpoint();

  const data = useLoad(
    async () => {
      const [roster, semesters] = await Promise.all([adminApi.semesterStudents(semester.id), adminApi.semesters('all')]);
      return {
        members: roster.students.filter((member) => !member.left_at),
        others: semesters.semesters.filter((other) => other.id !== semester.id),
      };
    },
    [semester.id],
    { refreshOnFocus: true }
  );

  const next = nextLevelTerm(config, semester.level, semester.semester, semester.session);
  const [target, setTarget] = React.useState<Target>('new');
  const [level, setLevel] = React.useState(next?.level ?? '');
  const [term, setTerm] = React.useState(next?.term ?? '');
  const [session, setSession] = React.useState(next?.session ?? semester.session);
  const [startDate, setStartDate] = React.useState<ISODate | null>(null);
  const [endDate, setEndDate] = React.useState<ISODate | null>(null);
  const [existingId, setExistingId] = React.useState<UUID | null>(null);
  const [chosen, setChosen] = React.useState<Set<UUID> | null>(null);
  const [missing, setMissing] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<ApiError | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Defaults once the config (levels, terms) is known.
  React.useEffect(() => {
    const value = nextLevelTerm(config, semester.level, semester.semester, semester.session);
    setLevel(value?.level ?? '');
    setTerm(value?.term ?? '');
    setSession(value?.session ?? semester.session);
  }, [config, semester.level, semester.semester, semester.session]);

  // Everyone is chosen until the admin changes the ticks; a refresh then keeps their ticks (minus
  // students who left). `ticksFor`: the semester whose ticks the admin changed.
  const ticksFor = React.useRef<UUID | null>(null);
  const changeTicks = (change: React.SetStateAction<Set<UUID> | null>) => {
    ticksFor.current = semester.id;
    setChosen(change);
  };
  React.useEffect(() => {
    if (!data.data) return;
    const ids = data.data.members.map((member) => member.profile_id);
    setChosen((current) => chosenAfterLoad(ids, current, ticksFor.current === semester.id));
    // A target finished or deleted elsewhere can no longer be chosen.
    const offered = data.data.others.filter((other) => other.is_active).map((other) => other.id);
    setExistingId((current) => keepChoice(current, offered, null));
  }, [data.data, semester.id]);

  if (semester.deleted) {
    return (
      <Card>
        <Notice tone="info" message="This semester is deleted. Restore it before promoting its students." />
      </Card>
    );
  }

  return (
    <LoadBlock state={data} loadingLabel="Loading students…">
      {({ members, others }) => {
        if (!members.length) {
          return (
            <Card>
              <EmptyState
                icon={GraduationCap}
                title="No current students to promote"
                message="Only current members can be promoted. Add students on the Students tab first."
              />
            </Card>
          );
        }
        const picked = chosen ?? new Set<UUID>();
        const existing = others.find((other) => other.id === existingId) ?? null;
        const targetLabel =
          target === 'existing'
            ? existing?.label ?? 'the chosen semester'
            : `${levelTermLabel(level, term)}${session.trim() ? ` · ${cleanSession(session)}` : ''}`;

        const toggle = (id: UUID) =>
          changeTicks((current) => {
            const nextSet = new Set(current ?? []);
            if (nextSet.has(id)) nextSet.delete(id);
            else nextSet.add(id);
            return nextSet;
          });

        async function promote() {
          const problems: Record<string, string> = {};
          if (target === 'new') {
            if (!level) problems.level = 'Choose the level.';
            if (!term) problems.semester = 'Choose the term.';
            if (!session.trim()) problems.session = 'Enter the session, e.g. 2025-26.';
            if (startDate && endDate && compareISODate(endDate, startDate) < 0) problems.end_date = 'The end date cannot be before the start date.';
          } else if (!existingId) {
            problems.target_semester_id = 'Choose the semester to move them to.';
          }
          if (!picked.size) problems.profile_ids = 'Choose at least one student.';
          setMissing(problems);
          if (Object.keys(problems).length) return;

          const ok = await confirm({
            title: `Promote ${plural(picked.size, 'student')}?`,
            message: `They move to ${targetLabel} and their level and term change to match. ${semester.label} is finished: it is not deleted and its attendance history is kept.`,
            confirmLabel: 'Promote',
          });
          if (!ok) return;

          // Exactly the students ticked here, even when that is everyone: without the list the server
          // would also move students added after this page loaded.
          const body: PromoteBody =
            target === 'new'
              ? {
                  target: { level, semester: term, session: cleanSession(session), start_date: startDate, end_date: endDate },
                  profile_ids: [...picked],
                }
              : { target: null, target_semester_id: existingId as UUID, profile_ids: [...picked] };

          setSaving(true);
          setError(null);
          try {
            const result = await adminApi.promoteSemester(semester.id, body);
            message.success(`${plural(result.moved, 'student')} moved to ${targetLabel}. ${semester.label} is finished.`);
            router.replace(`/admin/semesters/${result.target_semester_id}` as Href);
          } catch (caught) {
            const problem = toApiError(caught);
            setError(problem);
            // Students now in another active semester (nothing moved): untick them, the notice names them all.
            const clashing = new Set(semesterClashes(problem).map((clash) => clash.profile_id));
            if (clashing.size) changeTicks((current) => new Set([...(current ?? [])].filter((id) => !clashing.has(id))));
            // Someone left the class list, or the chosen semester was finished or deleted, meanwhile:
            // load it again (the ticks stay, minus who left; a target that can no longer be chosen
            // is dropped and shows greyed out).
            if (problem.field('profile_ids') || problem.field('target_semester_id') || problem.code === 'semester_finished') {
              void data.reload();
            }
          } finally {
            setSaving(false);
          }
        }

        // The new semester's field errors come nested under `target`.
        const targetError = (key: string) => {
          const nested = (error?.body.errors as { target?: Record<string, unknown> } | undefined)?.target?.[key];
          return Array.isArray(nested) && typeof nested[0] === 'string' ? nested[0] : undefined;
        };
        const err = (key: string) => missing[key] ?? fieldError(error, key) ?? targetError(key);
        const levelTaken = error?.code === ADMIN_ERRORS.levelHasActiveSemester;
        const existingOptions = others.map((other) => ({
          label: other.label,
          value: other.id,
          // Students moved into a finished semester would have no active one (the API refuses it).
          description: other.is_active
            ? `Active · ${plural(other.student_count, 'student')}`
            : `Finished · reopen it first · ${plural(other.student_count, 'student')}`,
          disabled: !other.is_active,
        }));
        const anyFinished = others.some((other) => !other.is_active);

        return (
          <>
            <Notice
              tone="info"
              title="What promoting does"
              message={`The students you choose leave ${semester.label} and join the semester below. Their level and term change to the new one's. ${semester.label} is then finished: it is never deleted, its attendance history stays, and teachers can still correct it.`}
            />

            <Card title="1. Move them to" className="gap-4">
              <ChoiceCards<Target>
                label="Move them to"
                value={target}
                onChange={setTarget}
                choices={[
                  {
                    value: 'new',
                    label: 'A new semester',
                    description: next ? `For example ${levelTermLabel(next.level, next.term)} · ${next.session}` : 'Set the level, term and session',
                  },
                  {
                    value: 'existing',
                    label: 'An existing semester',
                    description: others.length ? 'One that is already set up' : 'There is no other semester yet',
                  },
                ]}
              />

              {target === 'new' ? (
                <View className="gap-4">
                  {next ? null : (
                    <Notice tone="warn" message={`${semester.label} is the last level and term. Finish the semester instead when its students graduate.`} />
                  )}
                  <FieldRow>
                    <FieldCell>
                      <Select label="Level" required value={level || null} options={levelOptions(config)} onChange={setLevel} error={err('level')} />
                    </FieldCell>
                    <FieldCell>
                      <Select label="Term" required value={term || null} options={termOptions(config)} onChange={setTerm} error={err('semester')} />
                    </FieldCell>
                    <FieldCell>
                      <TextField
                        label="Session"
                        required
                        value={session}
                        onChangeText={setSession}
                        error={err('session')}
                        placeholder="2025-26"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </FieldCell>
                  </FieldRow>
                  <FieldRow>
                    <FieldCell>
                      <OptionalDateField label="Start date" value={startDate} onChange={setStartDate} error={err('start_date')} />
                    </FieldCell>
                    <FieldCell>
                      <OptionalDateField
                        label="End date"
                        value={endDate}
                        onChange={setEndDate}
                        error={err('end_date')}
                        minDate={startDate ?? undefined}
                      />
                    </FieldCell>
                  </FieldRow>
                  <Text variant="small" tone="muted">
                    If a semester with this level, term and session already exists, the students join it.
                  </Text>
                </View>
              ) : others.length ? (
                <Select
                  label="Semester"
                  required
                  value={existingId}
                  options={existingOptions}
                  onChange={setExistingId}
                  hint={anyFinished ? 'Finished semesters cannot be chosen. Reopen one on its page first.' : null}
                  error={err('target_semester_id')}
                />
              ) : (
                <Notice tone="info" message="There is no other semester. Choose “A new semester”." />
              )}
            </Card>

            <Card
              title="2. Choose the students"
              titleNote={`(${picked.size} of ${members.length})`}
              actions={
                <>
                  <Button
                    label="Select all"
                    variant="quiet"
                    compact
                    onPress={() => {
                      // Everyone again, as at the start: students who join later are ticked too.
                      ticksFor.current = null;
                      setChosen(new Set(members.map((member) => member.profile_id)));
                    }}
                  />
                  <Button label="Select none" variant="quiet" compact onPress={() => changeTicks(new Set())} />
                </>
              }
              className="gap-3"
            >
              <Text variant="small" tone="muted">
                Current members of {semester.label}. Students you leave out stay here.
              </Text>
              {err('profile_ids') ? <Notice tone="error" message={err('profile_ids') as string} live /> : null}
              <View role="list" accessibilityLabel="Students to promote" className={isDesktop ? 'flex-row flex-wrap' : undefined}>
                {members.map((member) => (
                  <View key={member.profile_id} role="listitem" className={isDesktop ? 'w-1/2 pr-3' : undefined}>
                    <Checkbox
                      checked={picked.has(member.profile_id)}
                      onChange={() => toggle(member.profile_id)}
                      label={`${member.name} · ${member.student_id}`}
                    />
                  </View>
                ))}
              </View>
            </Card>

            <Card title="3. Promote" className="gap-3">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text weight="semibold">{semester.label}</Text>
                <Icon as={ArrowRight} size={18} color="muted" />
                <Text weight="semibold">{targetLabel}</Text>
              </View>
              <Text tone="muted">
                {plural(picked.size, 'student')} will move. {semester.label} will be finished.
              </Text>
              {levelTaken && error ? (
                <LevelTakenNotice error={error} level={level} />
              ) : semesterClashes(error).length ? (
                <SemesterClashNotice error={error} title="Nobody was moved" />
              ) : (
                <FormError error={error} />
              )}
              <Button
                label={`Promote ${plural(picked.size, 'student')}`}
                variant="primary"
                icon={GraduationCap}
                loading={saving}
                // Nothing to move them to: the only semesters there are finished (greyed out above).
                disabled={!picked.size || (target === 'existing' && !existingOptions.some((option) => !option.disabled))}
                onPress={promote}
              />
            </Card>
          </>
        );
      }}
    </LoadBlock>
  );
}
