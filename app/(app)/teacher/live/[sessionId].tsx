import { Link, router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, LogOut } from 'lucide-react-native';
import * as React from 'react';
import { useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { courseHref, deliveryLabel, param } from '@/components/teacher/labels';
import { endSummary, useLiveSession } from '@/components/teacher/use-live-session';
import { teacherApi, type TeacherCourse } from '@/lib/api/teacher';
import { formatCode, formatCountdown } from '@/lib/format';
import { colors } from '@/lib/theme';

/** /teacher/live/[sessionId]?course=<courseInfoId>: the QR and code for a projector (no shell). */
export default function TeacherLiveScreen() {
  const params = useLocalSearchParams<{ sessionId: string; course?: string }>();
  const sessionId = param(params.sessionId) ?? '';
  const courseInfoId = param(params.course) ?? null;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const live = useLiveSession(sessionId);
  const [course, setCourse] = React.useState<TeacherCourse | null>(null);

  React.useEffect(() => {
    if (!courseInfoId) return;
    let alive = true;
    teacherApi
      .course(courseInfoId)
      .then((result) => alive && setCourse(result.course))
      .catch(() => {
        // The title is a nice-to-have: the code still works without it.
      });
    return () => {
      alive = false;
    };
  }, [courseInfoId]);

  const backHref = courseInfoId ? courseHref(courseInfoId) : '/teacher';
  const exit = () => {
    if (router.canGoBack()) router.back();
    else router.replace(backHref);
  };

  const wide = width >= 900 && width > height * 1.1;
  const phone = width < 600;
  const qrSize = Math.max(
    160,
    Math.floor(wide ? Math.min(width * 0.42, height - insets.top - insets.bottom - 190) : Math.min(width - 64, height * 0.46))
  );
  const codeSize = phone ? 52 : wide ? Math.min(112, Math.floor(width / 13)) : 84;

  const total = live.lists?.total ?? 0;
  const checkedIn = live.lists?.checked_in.length ?? 0;
  const title = course ? `${course.code} · ${course.title}` : 'Live session';

  let body: React.ReactNode;
  if (live.end) {
    body = (
      <Card className="w-full max-w-[560px] items-center gap-4 self-center py-8">
        <Icon as={CircleCheck} size={40} color={live.end.saved ? 'primary' : 'muted'} />
        <Text variant="title" align="center">
          {live.end.saved ? 'Session ended' : 'Session closed'}
        </Text>
        <Text tone="muted" align="center">
          {endSummary(live.end)}
        </Text>
        <Link href={backHref} asChild>
          <Button label={courseInfoId ? 'Back to the course' : 'Back to my courses'} variant="primary" className="self-center" />
        </Link>
      </Card>
    );
  } else if (!live.lists && live.error) {
    body = (
      <Card className="w-full max-w-[560px] self-center">
        <ErrorState title="Couldn't load the live session" message={live.error.message} onRetry={live.retry} />
      </Card>
    );
  } else if (!live.lists || !live.code) {
    body = <LoadingState label="Loading the code…" />;
  } else {
    body = (
      <View
        className={wide ? 'flex-row items-center justify-center gap-12' : 'items-center gap-6'}
        style={{ width: '100%' }}
      >
        <View
          className="rounded-card border border-border bg-surface p-4"
          accessible
          role="img"
          accessibilityLabel="QR code for check-in"
        >
          <QRCode value={live.code.check_in_url} size={qrSize} color={colors.text} backgroundColor={colors.surface} ecl="M" />
        </View>
        <View className={wide ? 'gap-4' : 'items-center gap-3'} style={{ maxWidth: wide ? 560 : undefined }}>
          <Text tone="muted" align={wide ? 'left' : 'center'} style={{ fontSize: phone ? 17 : 22, lineHeight: phone ? 24 : 30 }}>
            {live.lists.delivery === 'ONLINE' ? 'Type this code in the app' : 'Scan the QR code, or type this code'}
          </Text>
          <Text
            weight="bold"
            tabular
            align={wide ? 'left' : 'center'}
            style={{ fontSize: codeSize, lineHeight: Math.round(codeSize * 1.15), letterSpacing: phone ? 4 : 8 }}
            accessibilityLabel={`Code ${live.code.code.split('').join(' ')}`}
          >
            {formatCode(live.code.code)}
          </Text>
          <Text tone="muted" align={wide ? 'left' : 'center'} style={{ fontSize: phone ? 15 : 20, lineHeight: phone ? 22 : 28 }}>
            The code changes every 30 seconds
          </Text>
          <View className="mt-2 gap-2" style={{ width: wide ? 420 : Math.min(420, width - 48) }}>
            <View className={wide ? 'flex-row items-baseline gap-2.5' : 'flex-row items-baseline justify-center gap-2.5'}>
              <Text weight="bold" tabular style={{ fontSize: phone ? 20 : 28, lineHeight: phone ? 26 : 36 }}>
                {checkedIn} of {total}
              </Text>
              <Text tone="muted" style={{ fontSize: phone ? 15 : 20, lineHeight: phone ? 22 : 28 }}>
                checked in
              </Text>
            </View>
            <ProgressBar value={total ? (checkedIn / total) * 100 : 0} label={`${checkedIn} of ${total} checked in`} />
          </View>
          {live.connectionProblem ? (
            <Text variant="small" tone="warnInk">
              Connection problem: trying again…
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }}
    >
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-shrink gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="title" numberOfLines={2}>
              {title}
            </Text>
            {live.lists && !live.end ? <Pill label={`Live · ${deliveryLabel(live.lists.delivery)}`} tone="primary" dot /> : null}
          </View>
          {course ? (
            <Text tone="muted" numberOfLines={1}>
              {course.semester.label}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-4">
          {live.timeLeft !== null && !live.end ? (
            <Text
              weight="bold"
              tabular
              style={{ fontSize: phone ? 22 : 34, lineHeight: phone ? 28 : 42 }}
              accessibilityLabel={`${formatCountdown(live.timeLeft)} left`}
            >
              {formatCountdown(live.timeLeft)}{' '}
              <Text tone="muted" style={{ fontSize: phone ? 15 : 20 }}>
                left
              </Text>
            </Text>
          ) : null}
          <Button label="Exit" icon={LogOut} onPress={exit} accessibilityLabel="Exit full screen" />
        </View>
      </View>
      <View className="flex-1 justify-center py-4">{body}</View>
    </View>
  );
}
