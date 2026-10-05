import { Link } from 'expo-router';
import { Maximize, Plus } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { isApiError } from '@/lib/api/client';
import type { LiveSession } from '@/lib/api/sessions';
import type { Delivery, UUID } from '@/lib/api/types';
import { formatCode, formatCountdown, formatTime } from '@/lib/format';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { deliveryLabel, liveHref, methodLabel } from './labels';
import type { LiveSessionState } from './use-live-session';

/** Lists longer than this show a "Show all" button. */
const SHORT_LIST = 8;

const errorText = (caught: unknown, fallback: string) => (isApiError(caught) ? caught.message : fallback);

export type LivePanelProps = {
  session: Pick<LiveSession, 'id' | 'delivery'> & { course_info_id?: UUID };
  courseInfoId: UUID;
  live: LiveSessionState;
};

/** The QR, the 6-digit code, time left and the counts, with the session's buttons. */
export function LivePanel({ session, courseInfoId, live }: LivePanelProps) {
  const confirm = useConfirm();
  const message = useMessage();
  const { isDesktop } = useBreakpoint();
  const [busy, setBusy] = React.useState<'extend' | 'stop' | 'cancel' | null>(null);

  const delivery: Delivery = live.lists?.delivery ?? session.delivery;
  const total = live.lists?.total ?? 0;
  const checkedIn = live.lists?.checked_in.length ?? 0;
  const ended = !!live.end;

  async function extend() {
    setBusy('extend');
    try {
      await live.extend(2);
      message.success('Added 2 minutes.');
    } catch (caught) {
      message.error(errorText(caught, 'Could not add time.'));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: 'Cancel this session?',
      message: 'Nothing is saved: the check-ins so far are thrown away. You can start a new session afterwards.',
      confirmLabel: "Cancel, don't save",
      cancelLabel: 'Keep it running',
      destructive: true,
    });
    if (!ok) return;
    setBusy('cancel');
    try {
      await live.cancel();
    } catch (caught) {
      message.error(errorText(caught, 'Could not cancel the session.'));
    } finally {
      setBusy(null);
    }
  }

  async function stop() {
    const ok = await confirm({
      title: 'End and save now?',
      message: `Check-ins close now. ${checkedIn} of ${total} checked in: everyone else is saved as absent. You can correct days later in History.`,
      confirmLabel: 'End and save',
      cancelLabel: 'Keep it running',
    });
    if (!ok) return;
    setBusy('stop');
    try {
      await live.stop();
    } catch (caught) {
      message.error(errorText(caught, 'Could not save the session.'));
    } finally {
      setBusy(null);
    }
  }

  const qrSize = isDesktop ? 184 : 168;

  return (
    <Card className="gap-4" accessibilityLabel="Live session">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="section">Live session</Text>
          <Pill label={deliveryLabel(delivery)} tone="primary" dot />
        </View>
        <Text
          weight="bold"
          tabular
          style={{ fontSize: 22, lineHeight: 28 }}
          accessibilityLabel={live.timeLeft !== null ? `${formatCountdown(live.timeLeft)} left` : 'Time left loading'}
        >
          {live.timeLeft !== null ? formatCountdown(live.timeLeft) : '–:––'}{' '}
          <Text variant="small" tone="muted">
            left
          </Text>
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-6">
        <View
          className="items-center justify-center rounded-control border border-border bg-surface p-2.5"
          style={{ width: qrSize + 22, height: qrSize + 22 }}
          accessible
          accessibilityLabel="QR code for check-in"
          role="img"
        >
          {live.code ? (
            <QRCode value={live.code.check_in_url} size={qrSize} color={colors.text} backgroundColor={colors.surface} ecl="M" />
          ) : (
            <LoadingState label="Loading the code…" className="py-0" />
          )}
        </View>
        <View className="min-w-[200px] flex-1 gap-2.5">
          <Text variant="small" tone="muted">
            {delivery === 'ONLINE' ? 'Students type this code (or scan the QR on your shared screen)' : 'Students scan the QR, or type this code'}
          </Text>
          <Text variant="code" tabular accessibilityLabel={live.code ? `Code ${live.code.code.split('').join(' ')}` : 'Code loading'}>
            {live.code ? formatCode(live.code.code) : '––– –––'}
          </Text>
          <Text variant="small" tone="muted">
            The code changes every 30 seconds
          </Text>
          <View className="mt-1.5 flex-row flex-wrap items-baseline gap-1.5">
            <Text weight="bold" tabular>
              {checkedIn} of {total}
            </Text>
            <Text variant="small" tone="muted">
              checked in
            </Text>
          </View>
          <ProgressBar value={total ? (checkedIn / total) * 100 : 0} label={`${checkedIn} of ${total} checked in`} />
        </View>
      </View>

      {live.connectionProblem ? (
        <Notice tone="warn" message="Connection problem: the numbers may be a few seconds old. Trying again…" />
      ) : null}

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row flex-wrap gap-2">
          <Button label="+2 min" icon={Plus} onPress={extend} loading={busy === 'extend'} disabled={ended || !!busy} />
          <Link href={liveHref(session.id, courseInfoId)} asChild>
            <Button label="Full screen" icon={Maximize} disabled={ended} />
          </Link>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Cancel, don't save"
            variant="quiet"
            destructive
            onPress={cancel}
            loading={busy === 'cancel'}
            disabled={ended || !!busy}
          />
          <Button label="End and save" variant="primary" onPress={stop} loading={busy === 'stop'} disabled={ended || !!busy} />
        </View>
      </View>
    </Card>
  );
}

function ShowAll({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  if (count <= SHORT_LIST) return null;
  return (
    <Button
      label={open ? 'Show fewer' : `Show all (${count})`}
      variant="quiet"
      compact
      onPress={onToggle}
      accessibilityLabel={open ? 'Show fewer students' : `Show all ${count} students`}
    />
  );
}

/** "Not checked in yet (N)" with Mark present per student. */
export function WaitingList({ live }: { live: LiveSessionState }) {
  const message = useMessage();
  const [open, setOpen] = React.useState(false);
  const [marking, setMarking] = React.useState<Set<UUID>>(new Set());
  const waiting = live.lists?.not_checked_in ?? [];
  const shown = open ? waiting : waiting.slice(0, SHORT_LIST);

  async function mark(profileId: UUID, name: string) {
    setMarking((current) => new Set(current).add(profileId));
    try {
      await live.mark(profileId);
      message.success(`${name} is marked present.`);
    } catch (caught) {
      message.error(errorText(caught, `Could not mark ${name} present.`));
    } finally {
      setMarking((current) => {
        const next = new Set(current);
        next.delete(profileId);
        return next;
      });
    }
  }

  return (
    <Card
      title="Not checked in yet"
      titleNote={`(${waiting.length})`}
      actions={<ShowAll count={waiting.length} open={open} onToggle={() => setOpen((value) => !value)} />}
      padded={false}
      className="pb-2"
    >
      {!live.lists ? (
        <LoadingState />
      ) : waiting.length === 0 ? (
        <Text tone="muted" className="px-5 py-4">
          Everyone has checked in.
        </Text>
      ) : (
        <View className="mt-2">
          {shown.map((student, index) => (
            <View
              key={student.profile_id}
              className={cn('min-h-[56px] flex-row items-center justify-between gap-3 px-5 py-2', index > 0 && 'border-t border-border')}
            >
              <View className="flex-1 gap-0.5">
                <Text weight="semibold">{student.name}</Text>
                <Text variant="small" tone="muted" tabular>
                  {student.student_id}
                </Text>
              </View>
              <Button
                label="Mark present"
                compact
                accessibilityLabel={`Mark ${student.name} present`}
                loading={marking.has(student.profile_id)}
                disabled={!!live.end}
                onPress={() => mark(student.profile_id, student.name)}
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/** Who checked in, newest first, with how and when. */
export function CheckedInList({ live }: { live: LiveSessionState }) {
  const [open, setOpen] = React.useState(false);
  const checked = live.lists?.checked_in ?? [];
  const shown = open ? checked : checked.slice(0, SHORT_LIST);
  return (
    <Card
      title="Checked in"
      titleNote={`(${checked.length})`}
      actions={<ShowAll count={checked.length} open={open} onToggle={() => setOpen((value) => !value)} />}
      padded={false}
      className="pb-2"
    >
      {!live.lists ? (
        <LoadingState />
      ) : checked.length === 0 ? (
        <Text tone="muted" className="px-5 py-4">
          No one yet. Check-ins show here as they arrive.
        </Text>
      ) : (
        <View className="mt-2">
          {shown.map((student, index) => (
            <View
              key={student.profile_id}
              className={cn('min-h-[56px] flex-row items-center justify-between gap-3 px-5 py-2', index > 0 && 'border-t border-border')}
            >
              <View className="flex-1 gap-0.5">
                <Text weight="semibold">{student.name}</Text>
                <Text variant="small" tone="muted" tabular>
                  {student.student_id}
                </Text>
              </View>
              <View className="items-end gap-0.5">
                <Text variant="small" weight="semibold">
                  {methodLabel(student.method)}
                </Text>
                <Text variant="small" tone="muted" tabular>
                  {formatTime(student.time)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
