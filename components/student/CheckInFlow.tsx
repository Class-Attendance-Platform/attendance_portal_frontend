import { Link, useNavigation } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  House,
  QrCode,
  RefreshCw,
  ScanLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { Pill } from '@/components/ui/pill';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toApiError } from '@/lib/api/client';
import { sessionsApi } from '@/lib/api/sessions';
import { studentApi, type StudentLiveSession } from '@/lib/api/student';
import { formatDateTime, formatTime } from '@/lib/format';
import type { ColorToken } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { cleanCode, CODE_LENGTH, describeCheckInError, isCode, isSessionId, readCheckInLink, type CheckInProblem } from './logic';
import { HAS_QR_SCANNER, QrScanner } from './QrScanner';
import { useLiveSessions } from './use-live-sessions';

type QrLink = { sessionId: string; code: string };

type Outcome =
  | { kind: 'success'; course: { code: string; title: string }; time: string }
  | { kind: 'problem'; problem: CheckInProblem; via: 'link' | 'code' };

const RESULT_STYLE: Record<'success' | CheckInProblem['tone'], { icon: LucideIcon; tint: ColorToken; bg: string }> = {
  success: { icon: CircleCheck, tint: 'primary', bg: 'bg-primary-soft' },
  info: { icon: CircleCheck, tint: 'info', bg: 'bg-info-soft' },
  warn: { icon: TriangleAlert, tint: 'warn', bg: 'bg-warn-soft' },
  error: { icon: CircleAlert, tint: 'absent', bg: 'bg-absent-soft' },
};

/** The result of a check-in: a big icon, the title, details and what to do next. */
function ResultCard({
  tone,
  title,
  lines,
  message,
  children,
}: {
  tone: keyof typeof RESULT_STYLE;
  title: string;
  lines?: string[];
  message: string;
  children?: React.ReactNode;
}) {
  const style = RESULT_STYLE[tone];
  return (
    <Card>
      <View
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        accessibilityLiveRegion="polite"
        className="items-center gap-3 px-2 py-6"
      >
        <View className={cn('h-14 w-14 items-center justify-center rounded-pill', style.bg)}>
          <Icon as={style.icon} size={30} color={style.tint} />
        </View>
        <Text variant="section" align="center">
          {title}
        </Text>
        {lines?.map((line, index) => (
          <Text key={line} weight={index === 0 ? 'semibold' : 'regular'} tone={index === 0 ? 'default' : 'muted'} align="center">
            {line}
          </Text>
        ))}
        <Text tone="muted" align="center" className="max-w-[440px]">
          {message}
        </Text>
        {children ? <View className="mt-2 flex-row flex-wrap justify-center gap-2">{children}</View> : null}
      </View>
    </Card>
  );
}

/** The student's live classes, so they know what they are checking in to. */
function LiveNow({ sessions }: { sessions: StudentLiveSession[] | null }) {
  if (sessions === null) return null;
  if (!sessions.length) {
    return (
      <Notice message="No class of yours is taking attendance right now. If your teacher has just started, type the code below." />
    );
  }
  return (
    <Card title="Live now" padded={false}>
      <View className="mt-2 pb-1">
        {sessions.map((session, index) => (
          <ListRow
            key={session.session_id}
            title={`${session.course.code} · ${session.course.title}`}
            subtitle={`${session.delivery === 'ONLINE' ? 'Online class' : 'In class'} · until ${formatTime(session.ends_at)}`}
            right={
              session.checked_in ? (
                <Pill label="Checked in" tone="present" icon={Check} />
              ) : (
                <Pill label="Not checked in" tone="warn" />
              )
            }
            divider={index > 0}
          />
        ))}
      </View>
    </Card>
  );
}

export type CheckInFlowProps = {
  /** `?s=`: the session from a QR link or the "Live now" banner. */
  sessionId?: string;
  /** `?c=`: the code from a QR link. With a valid `sessionId` it is sent once, at once. */
  code?: string;
  /** Opened from an old-app QR link (those no longer work). */
  oldLink?: boolean;
};

/**
 * Checking in: a QR link (`?s=&c=`) is sent once by itself; otherwise the in-app scanner
 * (phones) and the 6-digit code field. Shows a clear result for every outcome.
 */
export function CheckInFlow({ sessionId, code: linkCode, oldLink }: CheckInFlowProps) {
  // This screen's own navigation: setParams changes only this page's address.
  const navigation = useNavigation();
  const { isDesktop } = useBreakpoint();
  const live = useLiveSessions();
  const refreshLive = live.refresh;

  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [sending, setSending] = React.useState<'link' | 'code' | null>(null);
  const [code, setCode] = React.useState('');
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [codeProblem, setCodeProblem] = React.useState<CheckInProblem | null>(null);
  const [scanNote, setScanNote] = React.useState<string | null>(null);
  /** The QR scanner was asked for (it starts hidden for an online class: those type the code). */
  const [scannerWanted, setScannerWanted] = React.useState(false);
  const busy = React.useRef(false);
  const lastLink = React.useRef<QrLink | null>(null);
  const sentLink = React.useRef<string | null>(null);

  const sendLink = React.useCallback(
    async (link: QrLink) => {
      if (busy.current) return;
      busy.current = true;
      lastLink.current = link;
      setSending('link');
      setScanNote(null);
      try {
        const response = await sessionsApi.checkIn({ code: link.code, session_id: link.sessionId });
        setOutcome({ kind: 'success', course: response.course, time: response.time });
        refreshLive();
      } catch (error) {
        setOutcome({ kind: 'problem', problem: describeCheckInError(toApiError(error), 'link'), via: 'link' });
      } finally {
        busy.current = false;
        setSending(null);
      }
    },
    [refreshLive]
  );

  const sendCode = async (typed = code) => {
    const clean = cleanCode(typed);
    if (clean.length !== CODE_LENGTH) {
      setCodeError(clean.length ? `Type all ${CODE_LENGTH} digits of the code.` : 'Type the 6-digit code first.');
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setCodeError(null);
    setCodeProblem(null);
    setSending('code');
    try {
      const response = await sessionsApi.checkIn({ code: clean });
      setOutcome({ kind: 'success', course: response.course, time: response.time });
      setCode('');
      refreshLive();
    } catch (caught) {
      const error = toApiError(caught);
      let problem = describeCheckInError(error, 'code');
      if (error.code === 'code_invalid') {
        // A typed code is matched against the student's live sessions, so a class that has just
        // closed answers "wrong code". If the class the student came for is gone, say it closed.
        const listed = live.sessions ?? [];
        const wanted = sessionId ?? (listed.length === 1 ? listed[0].session_id : null);
        if (wanted) {
          const fresh = await studentApi.live().catch(() => null);
          if (fresh && !fresh.sessions.some((session) => session.session_id === wanted)) {
            problem = describeCheckInError({ code: 'session_ended', status: 410 }, 'code');
          }
        }
        refreshLive();
      }
      if (error.code === 'already_checked_in' || problem.final) setOutcome({ kind: 'problem', problem, via: 'code' });
      else setCodeProblem(problem);
    } finally {
      busy.current = false;
      setSending(null);
    }
  };

  const onCodeChange = (text: string) => {
    setCodeError(null);
    setCodeProblem(null);
    // A pasted check-in link works too.
    if (/check-in/i.test(text)) {
      const link = readCheckInLink(text);
      if (link.kind === 'check-in') {
        setCode(link.code);
        sendLink(link);
        return;
      }
    }
    setCode(cleanCode(text));
  };

  const onScan = React.useCallback(
    (data: string) => {
      const link = readCheckInLink(data);
      if (link.kind === 'check-in') sendLink(link);
      else if (link.kind === 'old') {
        setScanNote('This QR code is from the old app and no longer works. Scan the new QR, or type the code.');
      }
      else setScanNote("This isn't a check-in QR code. Scan the QR your teacher shows in class.");
    },
    [sendLink]
  );

  // A QR link (?s=&c=): send it once. Then drop the code from the address, so a reload does not
  // send an expired code again.
  const linkReady = isSessionId(sessionId) && isCode(linkCode);
  React.useEffect(() => {
    if (!linkReady) return;
    const key = `${sessionId}:${linkCode}`;
    if (sentLink.current === key) return;
    sentLink.current = key;
    sendLink({ sessionId: sessionId as string, code: linkCode as string }).finally(() => {
      navigation.setParams({ c: undefined } as never);
    });
  }, [linkReady, sessionId, linkCode, sendLink, navigation]);

  const brokenLink = !!linkCode && !linkReady;
  const startOver = () => {
    setOutcome(null);
    setCodeProblem(null);
    setScanNote(null);
  };
  const homeButton = (variant: 'primary' | 'secondary' | 'quiet') => (
    <Link href="/student" asChild>
      <Button label="Back to home" icon={variant === 'quiet' ? ArrowLeft : House} variant={variant} />
    </Link>
  );

  if (sending === 'link') {
    return (
      <Card>
        <LoadingState label="Checking you in…" />
      </Card>
    );
  }

  if (outcome?.kind === 'success') {
    const others = (live.sessions ?? []).filter((session) => !session.checked_in && session.course.code !== outcome.course.code);
    return (
      <ResultCard
        tone="success"
        title="You're checked in"
        lines={[`${outcome.course.code} · ${outcome.course.title}`, formatDateTime(outcome.time)]}
        message="Your teacher can see you on the list now. It is saved when attendance closes."
      >
        {homeButton('primary')}
        {others.length ? <Button label="Check in to another class" icon={ScanLine} onPress={startOver} /> : null}
      </ResultCard>
    );
  }

  if (outcome?.kind === 'problem') {
    const { problem } = outcome;
    // Already checked in, or nothing the student can try again: home is the way on.
    const done = problem.tone === 'info' || !!problem.final;
    return (
      <ResultCard tone={problem.tone} title={problem.title} message={problem.message}>
        {problem.retry && lastLink.current && outcome.via === 'link' ? (
          <Button label="Try again" icon={RefreshCw} variant="primary" onPress={() => lastLink.current && sendLink(lastLink.current)} />
        ) : null}
        {done ? null : (
          <Button
            label={HAS_QR_SCANNER ? 'Scan or type the code' : 'Type the code instead'}
            icon={QrCode}
            variant={problem.retry ? 'secondary' : 'primary'}
            onPress={startOver}
          />
        )}
        {homeButton(done ? 'primary' : 'quiet')}
      </ResultCard>
    );
  }

  const target = live.sessions?.find((session) => session.session_id === sessionId);
  // Online classes type the code: the code comes first there and the camera stays off unless asked.
  const onlineOnly = target
    ? target.delivery === 'ONLINE'
    : !!live.sessions?.length && live.sessions.every((session) => session.delivery === 'ONLINE');
  // Coming from a banner (?s=) the class is known once the list loads: wait for it.
  const showScanner = HAS_QR_SCANNER && (scannerWanted || (live.sessions === null ? !sessionId : !onlineOnly));

  const scannerCard = showScanner ? (
    <Card title="Scan the QR" className="gap-3">
      <Text tone="muted">In class, point your camera at the QR code on the screen.</Text>
      <QrScanner onScan={onScan} paused={!!sending} />
      {scanNote ? <Notice tone="warn" message={scanNote} live /> : null}
    </Card>
  ) : null;

  return (
    <>
      {oldLink ? (
        <Notice
          tone="warn"
          title="This QR code is from the old app"
          message="Old QR codes no longer work. Scan the new QR in class, or type the 6-digit code."
        />
      ) : null}
      {brokenLink ? (
        <Notice tone="warn" title="This check-in link is incomplete" message="Type the 6-digit code your teacher shows instead." />
      ) : null}

      <LiveNow sessions={live.sessions} />

      {onlineOnly ? null : scannerCard}

      <Card title={target ? `Type the code for ${target.course.code}` : 'Type the code'} className="gap-4">
        <TextField
          label="6-digit code"
          value={code}
          onChangeText={onCodeChange}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => sendCode()}
          autoFocus={Platform.OS === 'web' && isDesktop && !linkCode}
          error={codeError}
          hint={`Your teacher shows it in class or shares it in an online class. It changes every 30 seconds.`}
          inputStyle={{ fontSize: 28, lineHeight: 36, letterSpacing: 8, fontVariant: ['tabular-nums'] }}
          className="mt-1"
        />
        {codeProblem ? <Notice tone={codeProblem.tone} title={codeProblem.title} message={codeProblem.message} live /> : null}
        <Button
          label="Check in"
          variant="primary"
          icon={Check}
          loading={sending === 'code'}
          onPress={() => sendCode()}
          fullWidth={!isDesktop}
        />
        {HAS_QR_SCANNER && !showScanner ? (
          <Button label="Scan a QR code instead" icon={ScanLine} onPress={() => setScannerWanted(true)} fullWidth={!isDesktop} />
        ) : null}
        {HAS_QR_SCANNER ? null : (
          <View className="flex-row items-start gap-2 border-t border-border pt-4">
            <Icon as={QrCode} size={20} color="muted" />
            <Text tone="muted" className="flex-1">
              In class? You can also scan the QR with your phone camera. It opens this page and checks you in.
            </Text>
          </View>
        )}
      </Card>

      {onlineOnly ? scannerCard : null}
    </>
  );
}
