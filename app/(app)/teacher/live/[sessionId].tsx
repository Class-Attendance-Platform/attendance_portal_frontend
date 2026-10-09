import { Link, router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, LogOut, WifiOff } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DocumentTitle } from '@/components/ui/document-title';
import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { courseHref, deliveryLabel, param } from '@/components/teacher/labels';
import { CODE_EXPIRED_TEXT } from '@/components/teacher/live-panel';
import { projectorLayout } from '@/components/teacher/live-rules';
import { leaveFullScreen, useKeepScreenOn } from '@/components/teacher/live-screen';
import { endSummary, useLiveSession } from '@/components/teacher/use-live-session';
import { teacherApi, type TeacherCourse } from '@/lib/api/teacher';
import { formatCode, formatCountdown } from '@/lib/format';
import { colors } from '@/lib/theme';

type Size = { width: number; height: number };

/** /teacher/live/[sessionId]?course=<courseInfoId>: the QR and code for a projector (no shell). */
export default function TeacherLiveScreen() {
  const params = useLocalSearchParams<{ sessionId: string; course?: string }>();
  const sessionId = param(params.sessionId) ?? '';
  const courseInfoId = param(params.course) ?? null;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const live = useLiveSession(sessionId);
  const [course, setCourse] = React.useState<TeacherCourse | null>(null);
  // Measured: the space under the header, and the words under the QR (stacked layout).
  const [area, setArea] = React.useState<Size | null>(null);
  const [infoHeight, setInfoHeight] = React.useState<number | null>(null);

  useKeepScreenOn(!!live.lists && !live.end);
  // However the page is left (Exit, a link, the browser's back), the browser's full screen ends too.
  React.useEffect(() => leaveFullScreen, []);

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

  const onAreaLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setArea((current) =>
      current && Math.abs(current.width - w) < 1 && Math.abs(current.height - h) < 1 ? current : { width: w, height: h }
    );
  }, []);
  const onInfoLayout = React.useCallback((event: LayoutChangeEvent) => {
    setInfoHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  // Until measured: the window less the padding and a usual header (taller on phones: it wraps).
  const narrow = width < 600;
  const { wide, small, qrSize, codeSize, infoWidth } = projectorLayout({
    width,
    height,
    areaWidth: area?.width ?? width - insets.left - insets.right - 40,
    areaHeight: area?.height ?? height - insets.top - insets.bottom - 28 - (narrow ? 150 : 60),
    infoHeight: infoHeight ?? (narrow ? 192 : 252),
  });

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
        <Link href={backHref} dismissTo asChild>
          <Button label={courseInfoId ? 'Back to the course' : 'Back to my courses'} variant="primary" className="self-center" />
        </Link>
      </Card>
    );
  } else if (live.error?.status === 403) {
    // Not this teacher's course: trying again can't help.
    body = (
      <Card className="w-full max-w-[560px] items-center self-center pb-8">
        <ErrorState title="Couldn't open the live session" message={live.error.message} className="pb-4" />
        <Link href="/teacher" dismissTo asChild>
          <Button label="Back to my courses" variant="primary" className="self-center" />
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
  } else if (live.codeExpired) {
    // The server no longer takes the last code: don't let students copy it.
    body = (
      <View
        role="alert"
        className="w-full max-w-[640px] items-center gap-3 self-center rounded-card border border-warn-border bg-warn-soft px-6 py-8"
      >
        <Icon as={WifiOff} size={small ? 32 : 48} color="warn" />
        <Text weight="bold" tone="warnInk" align="center" style={{ fontSize: small ? 22 : 30, lineHeight: small ? 28 : 38 }}>
          Connection problem
        </Text>
        <Text tone="warnInk" align="center" style={{ fontSize: small ? 17 : 22, lineHeight: small ? 24 : 30 }}>
          {CODE_EXPIRED_TEXT}
        </Text>
      </View>
    );
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
        <View className={wide ? 'gap-4' : 'items-center gap-3'} style={wide ? { width: infoWidth } : undefined} onLayout={onInfoLayout}>
          <Text tone="muted" align={wide ? 'left' : 'center'} style={{ fontSize: small ? 17 : 22, lineHeight: small ? 24 : 30 }}>
            {live.lists.delivery === 'ONLINE' ? 'Type this code in the app' : 'Scan the QR code, or type this code'}
          </Text>
          <Text
            weight="bold"
            tabular
            align={wide ? 'left' : 'center'}
            style={{ fontSize: codeSize, lineHeight: Math.round(codeSize * 1.15), letterSpacing: wide || !small ? 8 : 4 }}
            accessibilityLabel={`Code ${live.code.code.split('').join(' ')}`}
          >
            {formatCode(live.code.code)}
          </Text>
          <Text tone="muted" align={wide ? 'left' : 'center'} style={{ fontSize: small ? 15 : 20, lineHeight: small ? 22 : 28 }}>
            The code changes every 30 seconds
          </Text>
          <View className="mt-2 gap-2" style={{ width: wide ? Math.min(420, infoWidth) : infoWidth }}>
            <View className={wide ? 'flex-row items-baseline gap-2.5' : 'flex-row items-baseline justify-center gap-2.5'}>
              <Text weight="bold" tabular style={{ fontSize: small ? 20 : 28, lineHeight: small ? 26 : 36 }}>
                {checkedIn} of {total}
              </Text>
              <Text tone="muted" style={{ fontSize: small ? 15 : 20, lineHeight: small ? 22 : 28 }}>
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
      <DocumentTitle page={course ? `${course.code} live session` : 'Live session'} />
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
              style={{ fontSize: small ? 22 : 34, lineHeight: small ? 28 : 42 }}
              accessibilityLabel={`${formatCountdown(live.timeLeft)} left`}
            >
              {formatCountdown(live.timeLeft)}{' '}
              <Text tone="muted" style={{ fontSize: small ? 15 : 20 }}>
                left
              </Text>
            </Text>
          ) : null}
          <Button label="Exit" icon={LogOut} onPress={exit} accessibilityLabel="Exit full screen" />
        </View>
      </View>
      {/* Scrolls when the window is too small, so nothing is cut off or covers the header. */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}
        overScrollMode="never"
        bounces={false}
        onLayout={onAreaLayout}
      >
        {body}
      </ScrollView>
    </View>
  );
}
